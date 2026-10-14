import test from "node:test";
import assert from "node:assert/strict";
import { isValidReview, validateReview } from "../src/review.mjs";

const validReview = {
  id: "rev_01HZX9K2",
  entityType: "product",
  entityId: "verity:product:gtin:05901234123457",
  authorKeyId: "did:key:z6MkExample",
  rating: 4,
  text: "The product performed well after three weeks of daily use.",
  createdAt: "2026-10-14T17:00:00.000Z",
  status: "published",
  evidenceCommitment: "sha256:example"
};

test("accepts a structurally valid review", () => {
  assert.equal(isValidReview(validReview), true);
});

test("rejects a rating outside the supported range", () => {
  const errors = validateReview({ ...validReview, rating: 6 });
  assert.ok(errors.includes("rating must be an integer from 1 to 5"));
});

test("rejects an entity ID that does not match the review type", () => {
  const errors = validateReview({
    ...validReview,
    entityId: "verity:place:geo:52.22968:21.01223:cafe"
  });
  assert.ok(errors.includes("entityId must be a canonical Verity ID matching entityType"));
});

test("rejects short text", () => {
  const errors = validateReview({ ...validReview, text: "Too short" });
  assert.ok(errors.includes("text must contain at least 20 non-whitespace characters"));
});

test("does not require evidence for an unverified review", () => {
  assert.equal(isValidReview({ ...validReview, evidenceCommitment: undefined }), true);
});
