import { extractEntityCandidates } from "./shared/browser-adapter/extract.mjs";
import {
  createEvidenceCommitment,
  createEvidenceNonce
} from "./shared/core/evidence.mjs";
import { canonicalJson, createSignedReviewEvent } from "./shared/core/signed-review.mjs";
import { authorizeSigning, createPasskeyBackedKey, getIdentity } from "./passkey.mjs";
import { loadDraft, removeDraft, saveDraft, saveSignedEvent } from "./storage.mjs";

const elements = Object.fromEntries(
  [
    "api-url", "create-passkey", "diagnostics", "entity-card", "entity-id",
    "entity-name", "entity-source", "evidence", "identity", "page-type",
    "rating", "refresh", "review-card", "review-form", "review-text",
    "save-settings", "status"
  ].map((id) => [id, document.getElementById(id)])
);
let activeCandidate;
let activeResult;
let evidenceCommitment;
let evidenceOpening;

await initialize();

elements.refresh.addEventListener("click", inspectActivePage);
elements["create-passkey"].addEventListener("click", createIdentity);
elements["save-settings"].addEventListener("click", saveSettings);
elements["review-form"].addEventListener("input", persistDraft);
elements.evidence.addEventListener("change", commitEvidence);
elements["review-form"].addEventListener("submit", publishReview);

async function initialize() {
  const settings = await chrome.storage.local.get("apiUrl");
  if (settings.apiUrl) {
    elements["api-url"].value = settings.apiUrl;
  }
  await renderIdentity();
  await inspectActivePage();
}

async function inspectActivePage() {
  setStatus("Reading the active page…");
  elements["entity-card"].hidden = true;
  elements["review-card"].hidden = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith("http")) {
      throw new Error("open a regular web page before using Verity");
    }
    const [{ result: snapshot }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: location.href,
        html: document.documentElement.outerHTML
      })
    });
    const parsed = new DOMParser().parseFromString(snapshot.html, "text/html");
    activeResult = extractEntityCandidates(parsed, snapshot.url);
    activeCandidate = chooseCandidate(activeResult.candidates);
    renderDiagnostics(activeResult.diagnostics);
    if (!activeCandidate) {
      throw new Error("no supported product, place, or offer metadata was found");
    }
    await resolveCandidate(activeCandidate);
    await renderCandidate();
    setStatus("Entity detected. Confirm it before signing.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function chooseCandidate(candidates) {
  const product = candidates.find(({ entity }) => entity.type === "product");
  const place = candidates.find(({ entity }) => entity.type === "place");
  return product ?? place ?? candidates[0];
}

async function resolveCandidate(candidate) {
  if (!["product", "place"].includes(candidate.entity.type)) {
    return;
  }
  const response = await apiFetch("/v1/resolve", {
    method: "POST",
    body: JSON.stringify({ candidate })
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`entity resolution failed: ${result.message ?? response.status}`);
  }
  activeCandidate = result.entity;
}

async function renderCandidate() {
  const entity = activeCandidate.entity;
  elements["entity-name"].textContent =
    entity.name ?? entity.model ?? entity.provider ?? activeCandidate.id;
  elements["entity-id"].textContent = activeCandidate.id;
  elements["entity-source"].textContent =
    `Source: ${activeCandidate.source ?? "Verity API"} · ${activeResult.canonicalUrl}`;
  elements["page-type"].textContent = detectPageType(entity, activeResult.pageUrl);
  elements["entity-card"].hidden = false;
  elements["review-card"].hidden = false;
  const draft = await loadDraft(activeCandidate.id);
  elements.rating.value = draft?.rating ?? "";
  elements["review-text"].value = draft?.text ?? "";
  evidenceCommitment = draft?.evidenceCommitment;
  evidenceOpening = draft?.evidenceOpening;
}

function detectPageType(entity, url) {
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) {
    return "VIDEO PAGE";
  }
  return `${entity.type.toUpperCase()} PAGE`;
}

async function persistDraft() {
  if (!activeCandidate) {
    return;
  }
  await saveDraft(activeCandidate.id, {
    rating: elements.rating.value,
    text: elements["review-text"].value,
    evidenceCommitment,
    evidenceOpening
  });
}

async function commitEvidence() {
  const file = elements.evidence.files[0];
  if (!file) {
    evidenceCommitment = undefined;
    evidenceOpening = undefined;
    await persistDraft();
    return;
  }
  try {
    const nonce = createEvidenceNonce();
    evidenceCommitment = await createEvidenceCommitment(await file.arrayBuffer(), nonce);
    evidenceOpening = toBase64Url(nonce);
    await persistDraft();
    elements.evidence.value = "";
    setStatus("Evidence commitment created; the file was not retained.");
  } catch (error) {
    setStatus(`evidence commitment failed: ${error.message}`, true);
  }
}

async function createIdentity() {
  setStatus("Waiting for passkey creation…");
  try {
    const identity = await createPasskeyBackedKey();
    await renderIdentity(identity);
    setStatus("Passkey-backed author key created.");
  } catch (error) {
    setStatus(`identity creation failed: ${error.message}`, true);
  }
}

async function renderIdentity(identity = undefined) {
  const current = identity ?? await getIdentity();
  elements.identity.textContent = current
    ? `Author key: ${current.keyId}`
    : "No author key yet.";
  elements["create-passkey"].textContent = current
    ? "Replace passkey-backed key"
    : "Create passkey-backed key";
}

async function publishReview(event) {
  event.preventDefault();
  if (!activeCandidate || !elements["review-form"].reportValidity()) {
    return;
  }
  setStatus("Waiting for passkey verification…");
  try {
    const identity = await getIdentity();
    if (!identity) {
      throw new Error("create an author key first");
    }
    const review = {
      id: `rev_${crypto.randomUUID()}`,
      entityType: activeCandidate.entity.type,
      entityId: activeCandidate.id,
      authorKeyId: identity.keyId,
      rating: Number(elements.rating.value),
      text: elements["review-text"].value.trim(),
      createdAt: new Date().toISOString(),
      revision: 1,
      status: "published",
      ...(evidenceCommitment ? { evidenceCommitment } : {})
    };
    const challenge = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalJson({
          kind: "verity.review",
          version: 1,
          review
        }))
      )
    );
    const privateKey = await authorizeSigning(identity, challenge);
    const signedEvent = await createSignedReviewEvent(review, privateKey);
    await saveSignedEvent(
      signedEvent,
      { status: "pending", updatedAt: new Date().toISOString() },
      evidenceOpening
    );
    const response = await apiFetch("/v1/reviews", {
      method: "POST",
      body: JSON.stringify(signedEvent)
    });
    const body = await response.json();
    if (!response.ok) {
      await saveSignedEvent(signedEvent, {
        status: "failed",
        message: body.message,
        updatedAt: new Date().toISOString()
      });
      throw new Error(`publication failed; signed event retained locally: ${body.message}`);
    }
    await saveSignedEvent(signedEvent, { status: "published", updatedAt: new Date().toISOString() });
    await removeDraft(activeCandidate.id);
    elements["review-form"].reset();
    evidenceCommitment = undefined;
    evidenceOpening = undefined;
    setStatus(`Published signed review ${signedEvent.contentId}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function saveSettings() {
  try {
    const apiUrl = new URL(elements["api-url"].value);
    if (!["http:", "https:"].includes(apiUrl.protocol)) {
      throw new TypeError("API URL must use HTTP or HTTPS");
    }
    const originPermission = `${apiUrl.origin}/*`;
    const granted = await chrome.permissions.request({ origins: [originPermission] });
    if (!granted) {
      throw new Error("host permission is required to use this API");
    }
    await chrome.storage.local.set({ apiUrl: apiUrl.toString().replace(/\/$/, "") });
    setStatus("Settings saved.");
  } catch (error) {
    setStatus(`settings were not saved: ${error.message}`, true);
  }
}

async function apiFetch(path, init) {
  const settings = await chrome.storage.local.get("apiUrl");
  const baseUrl = settings.apiUrl ?? "http://127.0.0.1:8787";
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
}

function renderDiagnostics(diagnostics) {
  elements.diagnostics.replaceChildren(
    ...diagnostics.map((diagnostic) => {
      const item = document.createElement("li");
      item.textContent = `${diagnostic.code}: ${diagnostic.message}`;
      return item;
    })
  );
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.dataset.error = String(isError);
}

function toBase64Url(bytes) {
  let value = "";
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
