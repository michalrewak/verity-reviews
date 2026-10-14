# Architecture

## Phase 1 implementation

```text
Browser extension / mobile app
              |
              v
        Verity API
              |
       local JSON store
              |
      signed review events
              |
   optional external indexers
```

The private MVP is deliberately centralized enough to test, but all important
review records have a portable signed representation. `packages/api` provides
versioned HTTP endpoints backed by an atomically replaced JSON file. PostgreSQL
and search remain the intended production persistence layer. Federation and
anchoring are later protocol features, not prerequisites for testing the
product.

The Manifest V3 extension runs the shared browser metadata adapter against a
snapshot of the active page. It sends product and place candidates to the API
for canonical resolution, stores drafts and signed-event publication state in
extension storage, and keeps device-bound CryptoKeys in IndexedDB. A passkey
assertion with required user verification is challenged with the hash of the
exact review payload and gates each signing operation.

The installable mobile PWA declares a Web Share Target. It resolves shared URLs
through the same API and stores unsigned drafts locally for later signing.

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

The canonical strategies and merge rules are specified in [Entity identity](./ENTITY-IDENTITY.md).
Page extraction and its trust boundary are specified in [Browser metadata adapter](./BROWSER-ADAPTER.md).

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

The portable envelope and canonical serialization rules are specified in [Signed review events](./SIGNED-EVENTS.md).

## Data placement

| Data | Initial storage | Future option |
|---|---|---|
| Review text | local JSON API store | PostgreSQL, then author repositories + incentivized Verity swarm |
| Hash/signature | local JSON API store | PostgreSQL and optional L2 anchor |
| Receipt image | private object storage | encrypted user-controlled storage |
| Evidence commitment | signed review; source evidence is not retained | signed event replicas |
| Public attachments | object storage | IPFS with pinning |
| Dispute outcome | PostgreSQL append-only log | smart contract anchor |

Do not store raw receipts, names, addresses, or review text on a public blockchain.

## Reward model

Two assets: a transferable token (`VERA`, working name) paid per epoch from a fixed emission split across contribution, verification, and custody/delivery pools, and a non-transferable Trust Score that gates eligibility and multiplies rewards. Scoring is rating-blind by construction and settles only after a challenge window. Users may host and serve verified records and earn by importance-weighted proofs of custody and delivery. Specifications: [Economic layer](./ECONOMIC-LAYER.md), [Decentralized storage](./DECENTRALIZED-STORAGE.md).
