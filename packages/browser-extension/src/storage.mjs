const DRAFTS_KEY = "reviewDrafts";
const EVENTS_KEY = "signedReviewEvents";

export async function loadDraft(entityId) {
  const values = await chrome.storage.local.get(DRAFTS_KEY);
  return values[DRAFTS_KEY]?.[entityId] ?? null;
}

export async function saveDraft(entityId, draft) {
  const values = await chrome.storage.local.get(DRAFTS_KEY);
  const drafts = values[DRAFTS_KEY] ?? {};
  drafts[entityId] = { ...draft, updatedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [DRAFTS_KEY]: drafts });
}

export async function removeDraft(entityId) {
  const values = await chrome.storage.local.get(DRAFTS_KEY);
  const drafts = values[DRAFTS_KEY] ?? {};
  delete drafts[entityId];
  await chrome.storage.local.set({ [DRAFTS_KEY]: drafts });
}

export async function saveSignedEvent(event, publication, evidenceOpening = undefined) {
  const values = await chrome.storage.local.get(EVENTS_KEY);
  const events = values[EVENTS_KEY] ?? [];
  const key = `${event.review.id}:${event.review.revision}`;
  const existing = events.find((item) => item.key === key);
  const next = events.filter((item) => item.key !== key);
  next.push({
    key,
    event,
    publication,
    evidenceOpening: evidenceOpening ?? existing?.evidenceOpening
  });
  await chrome.storage.local.set({ [EVENTS_KEY]: next });
}
