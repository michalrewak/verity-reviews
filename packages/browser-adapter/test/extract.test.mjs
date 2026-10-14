import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";
import { extractEntityCandidates } from "../src/extract.mjs";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("extracts canonical product and seller offer identities", async () => {
  const document = await fixture("product.html");
  const result = extractEntityCandidates(
    document,
    "https://shop.example/products/widget-2?utm_medium=email"
  );

  assert.equal(result.canonicalUrl, "https://shop.example/products/widget-2?color=blue");
  assert.deepEqual(
    result.candidates.map(({ id }) => id),
    [
      "verity:product:gtin:05901234123457",
      "verity:offer:sku:shop.example:w2-blue"
    ]
  );
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.candidates[1].entity.productId, result.candidates[0].id);
});

test("extracts a LocalBusiness from an @graph", async () => {
  const document = await fixture("place.html");
  const result = extractEntityCandidates(document, "https://places.example/redirect?id=42");

  assert.equal(result.candidates.length, 1);
  assert.equal(
    result.candidates[0].id,
    "verity:place:address:pl:warszawa:marsza%C5%82kowska%201:cafe%20central:00-001"
  );
  assert.equal(result.candidates[0].entity.category, "Restaurant");
  assert.deepEqual(result.diagnostics, []);
});

test("resolves a relative offer URL when seller SKU identity is unavailable", () => {
  const document = parseHTML(`
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Uncoded handmade item",
        "brand": "Independent Maker",
        "offers": {
          "@type": "Offer",
          "url": "../offers/item-7?utm_source=profile"
        }
      }
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://market.example/items/current");
  const offer = result.candidates.find(({ entity }) => entity.type === "offer");

  assert.equal(
    offer.id,
    "verity:offer:url:https%3A%2F%2Fmarket.example%2Foffers%2Fitem-7"
  );
});

test("reports broken JSON-LD and returns an Open Graph fallback offer", async () => {
  const document = await fixture("fallback.html");
  const result = extractEntityCandidates(
    document,
    "https://market.example/listing/123?utm_source=social#details"
  );

  assert.equal(result.candidates.length, 1);
  assert.equal(
    result.candidates[0].id,
    "verity:offer:url:https%3A%2F%2Fmarket.example%2Flisting%2F123"
  );
  assert.equal(result.candidates[0].source, "open-graph");
  assert.equal(result.diagnostics[0].code, "INVALID_JSON_LD");
});

test("rejects calls without a DOM document", () => {
  assert.throws(
    () => extractEntityCandidates(undefined, "https://example.com/item"),
    /DOM Document/
  );
});

async function fixture(name) {
  const html = await readFile(join(fixtures, name), "utf8");
  return parseHTML(html).document;
}
