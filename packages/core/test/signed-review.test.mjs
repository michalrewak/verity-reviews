import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  canonicalJson,
  createSignedReviewEvent,
  verifySignedReviewEvent
} from "../src/signed-review.mjs";

const review = {
  id: "rev_01HZX9K2",
  entityType: "product",
  entityId: "verity:product:gtin:05901234123457",
  authorKeyId: "did:key:z6MkExample",
  rating: 4,
  text: "The product performed well after three weeks of daily use.",
  createdAt: "2026-10-14T17:00:00.000Z",
  revision: 1,
  status: "published",
  evidenceCommitment: "sha256:example"
};

test("serializes object keys deterministically", () => {
  assert.equal(
    canonicalJson({ zebra: 1, alpha: { two: 2, one: 1 } }),
    '{"alpha":{"one":1,"two":2},"zebra":1}'
  );
});

test("creates and verifies a signed review event", async () => {
  const keys = await generateKeys();
  const event = await createSignedReviewEvent(review, keys.privateKey, webcrypto);
  const result = await verifySignedReviewEvent(event, keys.publicKey, webcrypto);

  assert.equal(event.kind, "verity.review");
  assert.equal(event.version, 1);
  assert.match(event.contentId, /^sha256:[0-9a-f]{64}$/);
  assert.equal(event.signature.algorithm, "Ed25519");
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("rejects a review changed after signing", async () => {
  const keys = await generateKeys();
  const event = await createSignedReviewEvent(review, keys.privateKey, webcrypto);
  const tampered = {
    ...event,
    review: { ...event.review, rating: 1 }
  };
  const result = await verifySignedReviewEvent(tampered, keys.publicKey, webcrypto);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("contentId does not match the event payload"));
  assert.ok(result.errors.includes("signature is invalid"));
});

test("rejects a signature made by a different author key", async () => {
  const signerKeys = await generateKeys();
  const otherKeys = await generateKeys();
  const event = await createSignedReviewEvent(review, signerKeys.privateKey, webcrypto);
  const result = await verifySignedReviewEvent(event, otherKeys.publicKey, webcrypto);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("signature is invalid"));
});

test("rejects an invalid review before signing", async () => {
  const keys = await generateKeys();
  await assert.rejects(
    createSignedReviewEvent({ ...review, revision: 0 }, keys.privateKey, webcrypto),
    /review is invalid/
  );
});

test("rejects a malformed signature without invoking cryptographic verification", async () => {
  const keys = await generateKeys();
  const event = await createSignedReviewEvent(review, keys.privateKey, webcrypto);
  const result = await verifySignedReviewEvent(
    { ...event, signature: { ...event.signature, value: "invalid" } },
    keys.publicKey,
    webcrypto
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("signature value must be")));
});

async function generateKeys() {
  return webcrypto.subtle.generateKey(SIGNATURE_PARAMETERS, true, ["sign", "verify"]);
}

const SIGNATURE_PARAMETERS = { name: "Ed25519" };
