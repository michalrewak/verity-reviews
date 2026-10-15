import { parseShareTarget } from "./share.mjs";

const API_URL = localStorage.getItem("verityApiUrl") ?? "http://127.0.0.1:8787";
const share = parseShareTarget(location.href);
const status = document.getElementById("status");
const entitySection = document.getElementById("entity");
const form = document.getElementById("draft-form");
let entity;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

document.getElementById("shared-url").textContent = share.url ?? share.text ?? "";

if (!share.url) {
  setStatus("The share did not include a valid HTTP or HTTPS link.", true);
} else {
  await resolveSharedUrl();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!entity || !form.reportValidity()) {
    return;
  }
  const drafts = JSON.parse(localStorage.getItem("verityMobileDrafts") ?? "{}");
  drafts[entity.id] = {
    entityId: entity.id,
    entityType: entity.entity.type,
    rating: Number(document.getElementById("rating").value),
    text: document.getElementById("review-text").value.trim(),
    sourceUrl: share.url,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem("verityMobileDrafts", JSON.stringify(drafts));
  setStatus("Private draft saved on this device. Open the Verity extension to sign and publish it.");
});

async function resolveSharedUrl() {
  setStatus("Resolving the shared link…");
  try {
    const response = await fetch(`${API_URL}/v1/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: share.url })
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? "This page is not indexed yet. Open it with the Verity browser extension first."
          : body.message
      );
    }
    entity = body;
    document.getElementById("entity-type").textContent = body.entity.type.toUpperCase();
    document.getElementById("entity-name").textContent =
      body.entity.name ?? body.entity.model ?? body.id;
    document.getElementById("entity-id").textContent = body.id;
    entitySection.hidden = false;
    setStatus("Entity found. You can start a private draft.");
  } catch (error) {
    setStatus(`Unable to resolve link: ${error.message}`, true);
  }
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}
