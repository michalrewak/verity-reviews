import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { webcrypto } from "node:crypto";
import { createApiHandler } from "../src/app.mjs";
import { JsonStore } from "../src/store.mjs";
import { encodeEd25519DidKey } from "../../core/src/did-key.mjs";
import { createSignedReviewEvent } from "../../core/src/signed-review.mjs";

test("stores, resolves, and lists canonical products", async (context) => {
  const api = await startApi(context);
  const candidate = {
    id: "verity:product:gtin:05901234123457",
    entity: { type: "product", gtin: "5901234123457", name: "Field Pack" },
    references: ["https://shop.example/field-pack"]
  };

  const created = await request(api.url, "/v1/resolve", {
    method: "POST",
    body: JSON.stringify({ candidate })
  });
  assert.equal(created.status, 200);
  assert.equal((await created.json()).entity.id, candidate.id);

  const resolved = await request(api.url, "/v1/resolve", {
    method: "POST",
    body: JSON.stringify({ reference: candidate.references[0] })
  });
  assert.equal(resolved.status, 200);
  assert.equal((await resolved.json()).id, candidate.id);

  const listed = await request(api.url, "/v1/products");
  assert.equal((await listed.json()).items.length, 1);
});

test("rejects an entity whose id does not match its metadata", async (context) => {
  const api = await startApi(context);
  const response = await request(api.url, "/v1/products", {
    method: "POST",
    body: JSON.stringify({
      id: "verity:product:gtin:00000000000000",
      entity: { type: "product", gtin: "5901234123457" }
    })
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_REQUEST");
});

test("reports health and unknown routes", async (context) => {
  const api = await startApi(context);
  assert.equal((await request(api.url, "/health")).status, 200);
  assert.equal((await request(api.url, "/unknown")).status, 404);
});

test("accepts a correctly signed review and serves it for verification", async (context) => {
  const api = await startApi(context);
  const { event } = await signReview();

  const created = await request(api.url, "/v1/reviews", {
    method: "POST",
    body: JSON.stringify(event)
  });
  assert.equal(created.status, 201);

  const listed = await request(
    api.url,
    `/v1/reviews?entityId=${encodeURIComponent(event.review.entityId)}`
  );
  const body = await listed.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].contentId, event.contentId);
});

test("rejects a review whose payload was altered after signing", async (context) => {
  const api = await startApi(context);
  const { event } = await signReview();
  const tampered = { ...event, review: { ...event.review, rating: 1 } };

  const response = await request(api.url, "/v1/reviews", {
    method: "POST",
    body: JSON.stringify(tampered)
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /failed verification/);
  assert.match(body.message, /contentId does not match/);
});

test("does not let a tampered resubmission overwrite a stored review", async (context) => {
  const api = await startApi(context);
  const { event } = await signReview();
  await request(api.url, "/v1/reviews", { method: "POST", body: JSON.stringify(event) });

  const tampered = { ...event, review: { ...event.review, rating: 1 } };
  const attack = await request(api.url, "/v1/reviews", {
    method: "POST",
    body: JSON.stringify(tampered)
  });
  assert.equal(attack.status, 400);

  const listed = await request(
    api.url,
    `/v1/reviews?entityId=${encodeURIComponent(event.review.entityId)}`
  );
  const body = await listed.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].review.rating, event.review.rating);
});

test("rejects a review signed by a key other than the stated author key", async (context) => {
  const api = await startApi(context);
  const impostor = await signReview();
  const victim = await signReview();
  const forged = {
    ...impostor.event,
    review: { ...impostor.event.review, authorKeyId: victim.keyId },
    signature: { ...impostor.event.signature, keyId: victim.keyId }
  };

  const response = await request(api.url, "/v1/reviews", {
    method: "POST",
    body: JSON.stringify(forged)
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /failed verification/);
});

test("rejects an author key that cannot be resolved to a public key", async (context) => {
  const api = await startApi(context);
  const { event } = await signReview();
  const unresolvable = {
    ...event,
    review: { ...event.review, authorKeyId: "urn:verity:key:sha256:deadbeef" },
    signature: { ...event.signature, keyId: "urn:verity:key:sha256:deadbeef" }
  };

  const response = await request(api.url, "/v1/reviews", {
    method: "POST",
    body: JSON.stringify(unresolvable)
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /author key cannot be resolved/);
});

async function signReview(overrides = {}) {
  const keys = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const keyId = encodeEd25519DidKey(await webcrypto.subtle.exportKey("raw", keys.publicKey));
  const event = await createSignedReviewEvent(
    {
      id: `rev_${webcrypto.randomUUID()}`,
      entityType: "product",
      entityId: "verity:product:gtin:05901234123457",
      authorKeyId: keyId,
      rating: 4,
      text: "The pack held up well across three weeks of daily commuting use.",
      createdAt: "2026-10-14T17:00:00.000Z",
      revision: 1,
      status: "published",
      ...overrides
    },
    keys.privateKey,
    webcrypto
  );
  return { event, keyId, keys };
}

async function startApi(context) {
  const directory = await mkdtemp(join(tmpdir(), "verity-api-"));
  const server = createServer(
    createApiHandler(new JsonStore(join(directory, "data.json")))
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(async () => {
    server.close();
    await once(server, "close");
    await rm(directory, { recursive: true, force: true });
  });
  return { url: `http://127.0.0.1:${server.address().port}` };
}

function request(baseUrl, path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers }
  });
}
