# Architecture

## First implementation

```text
Browser extension / mobile app
              |
              v
        Verity API
              |
       PostgreSQL + search
              |
      signed review events
              |
   optional external indexers
```

The first implementation is deliberately centralized enough to ship, but all important records have a portable signed representation. Federation and anchoring are later protocol features, not prerequisites for testing the product.

## Canonical entity model

```text
Entity
├── Product: brand, model, GTIN/EAN, variant
├── Offer: seller, URL, price context, SKU
├── Place: name, address, coordinates, category
├── Service: provider, category, region
└── References: URLs and aliases
```

Reviews attach to an entity and optionally to an offer or visit. A URL is only one reference and must not be the primary identity.

## Review event

The MVP record contains:

- stable review ID;
- entity ID;
- author public-key identifier;
- created timestamp;
- structured rating dimensions;
- text;
- evidence commitment;
- revision number;
- signature placeholder;
- moderation status.

The core package validates shape and invariants. Cryptographic signing, key custody, and transport belong to the application layer.

## Data placement

| Data | Initial storage | Future option |
|---|---|---|
| Review text | PostgreSQL | signed event repositories |
| Hash/signature | PostgreSQL | L2 anchor |
| Receipt image | private object storage | encrypted user-controlled storage |
| Public attachments | object storage | IPFS with pinning |
| Dispute outcome | PostgreSQL append-only log | smart contract anchor |

Do not store raw receipts, names, addresses, or review text on a public blockchain.

## Reward model

The initial reward is non-transferable reputation. A review cannot earn it simply by being positive. Candidate reward signals are evidence quality, successful challenge resolution, useful corrections, and long-term predictive accuracy.
