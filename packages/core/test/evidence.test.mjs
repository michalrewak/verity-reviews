import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  createEvidenceCommitment,
  createEvidenceNonce
} from "../src/evidence.mjs";

test("creates deterministic commitments without retaining evidence", async () => {
  const nonce = new Uint8Array(32).fill(7);
  const first = await createEvidenceCommitment("receipt contents", nonce, webcrypto);
  const second = await createEvidenceCommitment("receipt contents", nonce, webcrypto);

  assert.match(first, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first, second);
  assert.equal(first.includes("receipt"), false);
});

test("binds commitments to the evidence and nonce", async () => {
  const nonce = new Uint8Array(32).fill(7);
  const otherNonce = new Uint8Array(32).fill(8);

  assert.notEqual(
    await createEvidenceCommitment("receipt A", nonce, webcrypto),
    await createEvidenceCommitment("receipt B", nonce, webcrypto)
  );
  assert.notEqual(
    await createEvidenceCommitment("receipt A", nonce, webcrypto),
    await createEvidenceCommitment("receipt A", otherNonce, webcrypto)
  );
});

test("creates a 256-bit random nonce", () => {
  assert.equal(createEvidenceNonce(webcrypto).byteLength, 32);
});

test("rejects empty evidence and short nonces", async () => {
  await assert.rejects(
    createEvidenceCommitment("", new Uint8Array(32), webcrypto),
    /must not be empty/
  );
  await assert.rejects(
    createEvidenceCommitment("receipt", new Uint8Array(8), webcrypto),
    /at least 16 bytes/
  );
});
