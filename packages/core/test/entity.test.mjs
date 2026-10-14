import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeUrl,
  createEntityId,
  normalizeGtin,
  normalizeIdentityText,
  validateEntityId
} from "../src/entity.mjs";

test("normalizes equivalent product names consistently", () => {
  assert.equal(normalizeIdentityText("  ACME\u00a0  Widget™ "), "acme widgettm");
});

test("normalizes a valid EAN-13 to the GTIN-14 representation", () => {
  assert.equal(normalizeGtin("5901234123457"), "05901234123457");
});

test("rejects a GTIN with an invalid check digit", () => {
  assert.throws(() => normalizeGtin("5901234123458"), /check digit/);
});

test("uses GTIN as the canonical product identity", () => {
  assert.equal(
    createEntityId({ type: "product", gtin: "5901234123457" }),
    "verity:product:gtin:05901234123457"
  );
});

test("falls back to brand, model, and variant for products without GTIN", () => {
  assert.equal(
    createEntityId({
      type: "product",
      brand: "ACME",
      model: "Widget 2",
      variant: "Blue / 128 GB"
    }),
    "verity:product:model:acme:widget%202:blue%20%2F%20128%20gb"
  );
});

test("identifies an offer by seller and SKU", () => {
  assert.equal(
    createEntityId({ type: "offer", sellerId: "shop.example", sku: " ABC-12 " }),
    "verity:offer:sku:shop.example:abc-12"
  );
});

test("canonicalizes an offer URL and removes tracking data", () => {
  assert.equal(
    canonicalizeUrl("HTTPS://Example.com:443/item/42/?utm_source=mail&size=m#reviews"),
    "https://example.com/item/42?size=m"
  );
});

test("identifies a place by normalized address", () => {
  assert.equal(
    createEntityId({
      type: "place",
      name: "Cafe Central",
      address: {
        countryCode: "PL",
        locality: "Warszawa",
        street: "Marszałkowska 1",
        postalCode: "00-001"
      }
    }),
    "verity:place:address:pl:warszawa:marsza%C5%82kowska%201:cafe%20central:00-001"
  );
});

test("rounds coordinates to approximately one metre for place identity", () => {
  assert.equal(
    createEntityId({
      type: "place",
      name: "Trail Kiosk",
      latitude: 52.2296756,
      longitude: 21.0122287
    }),
    "verity:place:geo:52.22968:21.01223:trail%20kiosk"
  );
});

test("identifies a regional service independently of a page URL", () => {
  assert.equal(
    createEntityId({
      type: "service",
      provider: "ACME Repairs",
      category: "Phone repair",
      region: "Warszawa"
    }),
    "verity:service:provider:acme%20repairs:phone%20repair:warszawa"
  );
});

test("validates the entity type encoded in an ID", () => {
  const id = "verity:product:gtin:05901234123457";
  assert.equal(validateEntityId(id, "product"), true);
  assert.equal(validateEntityId(id, "place"), false);
});

test("rejects malformed canonical IDs", () => {
  assert.equal(validateEntityId("verity:product:model:acme", "product"), false);
  assert.equal(validateEntityId("verity:product:gtin:05901234123458", "product"), false);
  assert.equal(validateEntityId("verity:unknown:model:acme:widget"), false);
});
