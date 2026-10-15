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

test("extracts a product group with a canonical group identifier", () => {
  const document = parseHTML(`
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ProductGroup",
        "name": "Nike Air Force 1 '07 Men's Shoes",
        "productGroupID": "CW2288-111",
        "brand": { "@type": "Brand", "name": "Nike" },
        "hasVariant": [
          {
            "@type": "Product",
            "name": "Nike Air Force 1 '07 Men's Shoes - White - Size 5",
            "mpn": "CW2288-111",
            "gtin": "00194500874862",
            "size": "5"
          },
          {
            "@type": "Product",
            "name": "Nike Air Force 1 '07 Men's Shoes - White - Size 6",
            "mpn": "CW2288-111",
            "gtin": "00194500874886",
            "size": "6"
          }
        ]
      }
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://www.nike.com/product/air-force-1");

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].entity.type, "product");
  assert.equal(result.candidates[0].id, "verity:product:model:nike:cw2288-111");
});

test("resolves a brand URL instead of using the raw URL as its identity", () => {
  const document = parseHTML(`
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://www.apple.com/#organization",
            "name": "Apple"
          },
          {
            "@type": "Product",
            "name": "MacBook Air",
            "brand": "https://www.apple.com/mac/#brand"
          }
        ]
      }
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://www.apple.com/macbook-air/");
  const product = result.candidates.find(({ entity }) => entity.type === "product");

  assert.equal(product.entity.brand, "Apple");
  assert.equal(product.id, "verity:product:model:apple:macbook%20air");
});

test("does not treat collection pages as one product or generic Open Graph pages as offers", () => {
  const document = parseHTML(`
    <meta property="og:type" content="website">
    <meta property="og:title" content="Bookcases">
    <meta property="og:site_name" content="Example Shop">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Bookcases",
        "mainEntity": {
          "@type": "ItemList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "item": { "@type": "Product", "name": "Bookcase One" }
            },
            {
              "@type": "ListItem",
              "item": { "@type": "Product", "name": "Bookcase Two" }
            }
          ]
        }
      }
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://shop.example/bookcases");

  assert.deepEqual(result.candidates, []);
  assert.equal(result.diagnostics[0].code, "NON_ENTITY_PAGE");
});

test("rejects all listed places on a collection page instead of leaving the first selectable", () => {
  const document = parseHTML(`
    <script type="application/ld+json">
      [
        {
          "@context": "https://schema.org",
          "@type": ["WebPage", "CollectionPage"],
          "name": "Bakery locations"
        },
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Bakery One",
          "geo": { "@type": "GeoCoordinates", "latitude": 37.8, "longitude": -122.4 }
        },
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Bakery Two",
          "geo": { "@type": "GeoCoordinates", "latitude": 37.9, "longitude": -122.5 }
        }
      ]
    </script>
  `).document;

  const result = extractEntityCandidates(document, "https://bakery.example/locations");

  assert.deepEqual(result.candidates, []);
  assert.equal(result.diagnostics[0].code, "NON_ENTITY_PAGE");
});

test("does not infer an offer from generic Open Graph website metadata", () => {
  const document = parseHTML(`
    <meta property="og:type" content="website">
    <meta property="og:title" content="Plan your visit">
    <meta property="og:site_name" content="City Museum">
  `).document;

  const result = extractEntityCandidates(document, "https://museum.example/visit");

  assert.deepEqual(result.candidates, []);
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

test("extracts place metadata encoded as Schema.org Microdata", () => {
  const document = parseHTML(`
    <div itemscope itemtype="https://schema.org/Restaurant">
      <span itemprop="name">GreatFood</span>
      <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
        <span itemprop="streetAddress">1901 Lemur Ave</span>
        <span itemprop="addressLocality">Sunnyvale</span>
        <span itemprop="addressRegion">CA</span>
        <meta itemprop="addressCountry" content="US">
        <span itemprop="postalCode">94086</span>
      </div>
      <div itemprop="geo" itemscope itemtype="https://schema.org/GeoCoordinates">
        <meta itemprop="latitude" content="37.3688">
        <meta itemprop="longitude" content="-122.0363">
      </div>
    </div>
  `).document;

  const result = extractEntityCandidates(document, "https://greatfood.example/");

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].entity.type, "place");
  assert.equal(result.candidates[0].entity.name, "GreatFood");
  assert.equal(result.candidates[0].source, "microdata:LocalBusiness");
  assert.equal(
    result.candidates[0].id,
    "verity:place:address:us:sunnyvale:1901%20lemur%20ave:greatfood:94086"
  );
});

test("extracts place metadata encoded as Schema.org RDFa", () => {
  const document = parseHTML(`
    <div vocab="https://schema.org/" typeof="Restaurant">
      <span property="name">Tartine Bakery</span>
      <div property="address" typeof="PostalAddress">
        <span property="streetAddress">600 Guerrero St</span>
        <span property="addressLocality">San Francisco</span>
        <span property="addressRegion">CA</span>
        <meta property="addressCountry" content="US">
        <span property="postalCode">94110</span>
      </div>
    </div>
  `).document;

  const result = extractEntityCandidates(document, "https://tartinebakery.example/location");

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].entity.type, "place");
  assert.equal(result.candidates[0].entity.category, "Restaurant");
  assert.equal(result.candidates[0].source, "rdfa:LocalBusiness");
  assert.equal(
    result.candidates[0].id,
    "verity:place:address:us:san%20francisco:600%20guerrero%20st:tartine%20bakery:94110"
  );
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
