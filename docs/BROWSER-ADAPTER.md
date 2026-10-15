# Browser metadata adapter

The browser adapter turns metadata already present on a page into entity candidates. It does not trust the merchant as an identity authority; extracted data is a proposal that clients display before a user signs a review.

## Sources

The prototype reads:

1. `link[rel=canonical]`;
2. Schema.org JSON-LD `Product`, `ProductGroup`, `Offer`, and local-business/place subtypes;
3. Open Graph title and site name as an offer fallback only when `og:type`
   identifies a product.

Malformed JSON-LD is exposed through structured diagnostics rather than silently ignored.
Collection and search-result pages are not treated as reviewable entities, even
when their JSON-LD contains a list of products. A client must not guess which
listed product the user intended to review.

For a `ProductGroup`, the adapter uses a shared variant MPN/model when all
published variants agree; otherwise it falls back to the group identifier or
name. Brand references expressed as URLs are resolved to a referenced name
when possible, or to the brand host label.

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

## Live-site pilot

A manual smoke test on 2026-10-15 fetched current public HTML and ran it through
the adapter. The HTML was not saved in the repository; the cases below are
represented by small, deterministic fixtures in the unit tests.

| Site/page | Observed result |
| --- | --- |
| IKEA BILLY page | The URL redirected to a collection page; correctly returned no candidate rather than an arbitrary listed product. |
| Nike Air Force 1 product page | `ProductGroup` produced one product identity using the shared variant MPN, not a size-specific GTIN. |
| Apple MacBook Air page | Product markup referenced its brand by URL; adapter resolved the brand label to Apple. The page groups two MacBook Air sizes in one name, so that identity remains page-level and needs user confirmation. |
| Samsung Galaxy S25 Ultra page | Product markup produced a product candidate from its brand and model identifier. |
| Rijksmuseum and National Gallery visit pages | No supported place schema was present; neither generic `og:type=website` page was mislabeled as an offer. |
| Starbucks store page | No parseable supported entity metadata was present. |

This is a point-in-time compatibility check, not a guarantee about third-party
markup. Some sites block automated retrieval or vary metadata by region and
session. Real page candidates remain proposals that users must confirm.
