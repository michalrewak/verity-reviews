# Browser metadata adapter

The browser adapter turns metadata already present on a page into entity candidates. It does not trust the merchant as an identity authority; extracted data is a proposal that clients display before a user signs a review.

## Sources

The prototype reads:

1. `link[rel=canonical]`;
2. Schema.org JSON-LD `Product`, `Offer`, and local-business/place subtypes;
3. Open Graph title and site name as a low-confidence offer fallback.

Malformed JSON-LD is exposed through structured diagnostics rather than silently ignored.

## Contract

```js
const result = extractEntityCandidates(document, window.location.href);
```

The result contains:

- normalized page and canonical URLs;
- zero or more candidates with canonical Verity IDs;
- the metadata source for each candidate;
- page references;
- extraction diagnostics.

Product and offer candidates remain separate. A product identifies the thing being reviewed, while an offer identifies a seller-specific listing. When both are available, the offer includes the proposed product ID.

## Trust boundary

Page metadata can be incomplete, stale, or intentionally false. Before accepting a candidate, clients should:

- show the extracted name, seller, model, and location to the user;
- prefer valid GTIN over page names;
- compare candidates with known aliases from an indexer;
- retain the source URL and extraction time;
- never treat Schema.org markup as proof of purchase or merchant ownership.

## Extension integration

The Phase 1 extension captures the active tab's HTML with `activeTab` and
`scripting` permissions, parses it in the side panel, and invokes this adapter.
The extension build copies the adapter and its core identity dependency into
the unpacked artifact rather than maintaining a second extraction
implementation. Product and place candidates are submitted to
`POST /v1/resolve`; offers remain valid local review targets when a canonical
product is unavailable.
