import { validateEntityId } from "./entity.mjs";

const REVIEW_TYPES = new Set(["product", "offer", "service", "place"]);
const REVIEW_STATUSES = new Set(["draft", "published", "under_review", "hidden"]);

export function validateReview(review) {
  const errors = [];

  if (!review || typeof review !== "object") {
    return ["review must be an object"];
  }

  if (typeof review.id !== "string" || review.id.length < 8) {
    errors.push("id must be a string of at least 8 characters");
  }
  if (!REVIEW_TYPES.has(review.entityType)) {
    errors.push("entityType must be product, offer, service, or place");
  }
  if (!validateEntityId(review.entityId, review.entityType)) {
    errors.push("entityId must be a canonical Verity ID matching entityType");
  }
  if (typeof review.authorKeyId !== "string" || review.authorKeyId.length < 1) {
    errors.push("authorKeyId is required");
  }
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    errors.push("rating must be an integer from 1 to 5");
  }
  if (typeof review.text !== "string" || review.text.trim().length < 20) {
    errors.push("text must contain at least 20 non-whitespace characters");
  }
  if (typeof review.createdAt !== "string" || Number.isNaN(Date.parse(review.createdAt))) {
    errors.push("createdAt must be an ISO date string");
  }
  if (!Number.isInteger(review.revision) || review.revision < 1) {
    errors.push("revision must be a positive integer");
  }
  if (!REVIEW_STATUSES.has(review.status)) {
    errors.push("status is invalid");
  }
  if (review.evidenceCommitment !== undefined && typeof review.evidenceCommitment !== "string") {
    errors.push("evidenceCommitment must be a string when provided");
  }

  return errors;
}

export function isValidReview(review) {
  return validateReview(review).length === 0;
}
