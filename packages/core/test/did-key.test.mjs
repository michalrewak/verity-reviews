import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  decodeEd25519DidKey,
  encodeEd25519DidKey,
  isEd25519DidKey
} from "../src/did-key.mjs";

test("round-trips an Ed25519 public key through did:key", async () => {
  const keys = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await webcrypto.subtle.exportKey("raw", keys.publicKey));
  const did = encodeEd25519DidKey(raw);

  assert.match(did, /^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
  assert.deepEqual(decodeEd25519DidKey(did), raw);
});

test("matches the published did:key test vector", () => {
  const did = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
  const key = decodeEd25519DidKey(did);

  assert.equal(key.byteLength, 32);
  assert.equal(encodeEd25519DidKey(key), did);
});

test("rejects identifiers that are not Ed25519 did:key values", () => {
  assert.equal(isEd25519DidKey("urn:verity:key:sha256:abc"), false);
  assert.equal(isEd25519DidKey("did:key:z6Mk!invalid"), false);
  assert.equal(isEd25519DidKey(undefined), false);
  assert.throws(() => encodeEd25519DidKey(new Uint8Array(31)), /32 bytes/);
});
