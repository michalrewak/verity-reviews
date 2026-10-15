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

test("keeps a product identity when the published GTIN is malformed", () => {
  const document = parseHTML(`
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Volta City E1",
        "brand": { "@type": "Brand", "name": "Volta" },
        "model": "City E1",
        "gtin13": "5901234987650",
        "color": "Zielony",
        "sku": "VLT-CE1-GRN",
        "offers": {
          "@type": "Offer",
          "url": "/rowery/volta-city-e1",
          "seller": { "@type": "Organization", "name": "Sklep Rowerowy" }
        }
      }
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://sklep.example/rowery/volta-city-e1");
  const product = result.candidates.find(({ entity }) => entity.type === "product");

  assert.equal(product.id, "verity:product:model:volta:city%20e1:zielony");
  assert.equal(product.entity.gtin, undefined);
  assert.equal(result.diagnostics[0].code, "INCOMPLETE_ENTITY");
  assert.match(result.diagnostics[0].message, /check digit/);
});

test("treats food establishment subtypes as places", () => {
  const document = parseHTML(`
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Bakery",
        "name": "Piekarnia Ziarno",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Długa 7",
          "addressLocality": "Kraków",
          "postalCode": "31-147",
          "addressCountry": "PL"
        }
      }
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://mapy.example/piekarnia-ziarno");

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].entity.type, "place");
  assert.equal(result.candidates[0].entity.category, "Bakery");
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
