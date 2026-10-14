import test from "node:test";
import assert from "node:assert/strict";
import { parseShareTarget } from "../share.mjs";

test("reads a URL supplied by a Web Share Target", () => {
  const result = parseShareTarget(
    "https://verity.example/share?title=Item&url=https%3A%2F%2Fshop.example%2Fp%2F1"
  );
  assert.deepEqual(result, {
    title: "Item",
    text: null,
    url: "https://shop.example/p/1"
  });
});

test("finds a shared URL embedded in text", () => {
  const result = parseShareTarget(
    "https://verity.example/share?text=See%20https%3A%2F%2Fplaces.example%2Fcafe"
  );
  assert.equal(result.url, "https://places.example/cafe");
});

test("rejects non-HTTP share values", () => {
  assert.equal(parseShareTarget("https://verity.example/share?url=file%3A%2F%2Fsecret").url, null);
});
