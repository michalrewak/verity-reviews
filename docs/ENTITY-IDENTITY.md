# Entity identity

Verity attaches reviews to stable entities rather than individual web pages. URLs are references that can change, disappear, or be duplicated across merchants.

## Identifier format

Identifiers use this versionless MVP structure:

```text
verity:<entity-type>:<identity-strategy>:<encoded-components>
```

Every component is Unicode-normalized with NFKC, whitespace-collapsed, lower-cased, and percent-encoded. A future incompatible format will introduce an explicit version or a new namespace.

## Identity strategies

| Entity | Preferred strategy | Fallback |
|---|---|---|
| Product | GTIN normalized to 14 digits | brand + model + variant |
| Offer | seller identity + seller SKU | canonical URL |
| Place | structured postal address | coordinates rounded to 5 decimals + name |
| Service | provider + category + region | none in MVP |

### Products

GTIN is validated using its check digit and normalized to a 14-digit representation so that EAN-8, UPC-A, EAN-13, and GTIN-14 can be compared consistently.

A brand/model identifier is weaker than GTIN. Indexers should retain provenance and allow later merging when a trustworthy GTIN becomes available.

### Offers

An offer is a seller-specific listing, not the underlying product. Seller plus SKU is preferred because page URLs often contain tracking parameters or change during redesigns. URL fallback removes fragments and known tracking parameters, sorts the remaining query parameters, and normalizes default ports.

### Places

Address identity works best for established venues. Coordinate identity rounds latitude and longitude to five decimal places, approximately metre-level precision. Indexers must treat nearby candidates as possible duplicates rather than automatically merging them.

### Services

The MVP identifies a service by provider, category, and region. This intentionally distinguishes a national service from a local branch while avoiding dependence on a single listing page.

## Aliases and merging

Canonicalization does not prove two records represent the same real-world object. Indexers should maintain:

- source references and discovery timestamps;
- aliases from old IDs to a canonical ID;
- merge proposals with evidence;
- reversible merge history;
- separate product and offer records.

Automated extraction may propose an identity, but a signed review must contain the exact entity ID the author saw and accepted.
