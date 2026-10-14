import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApiHandler } from "../src/app.mjs";
import { JsonStore } from "../src/store.mjs";

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
