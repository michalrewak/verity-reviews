# Verity

**Verity** is an independent, portable review layer for products, services, and places.

The project aims to make reviews:

- portable across apps and websites;
- cryptographically signed and auditable;
- linked to a product, offer, or location rather than only a URL;
- optionally backed by privacy-preserving proof of contact;
- resistant to bot farms and coordinated manipulation;
- moderated transparently without giving merchants unilateral deletion power.

Verity is not a review marketplace and does not reward positive sentiment. The initial product rewards useful evidence, accurate verification, and long-term reliability.

## Status

Early research and MVP implementation.

## MVP scope

1. A canonical review data model.
2. Ed25519-compatible signing boundary (crypto implementation is intentionally outside the first core package).
3. Product/place identity resolution independent of a single merchant URL.
4. Browser-extension and mobile-client integration contracts.
5. Transparent moderation and dispute records.
6. Economic layer: a transferable token (`VERA`, working name) with three reward pools — contributions, verification, and user-run custody/delivery of verified records — gated by a non-transferable Trust Score. See [docs/ECONOMIC-LAYER.md](./docs/ECONOMIC-LAYER.md).

## Repository layout

```text
docs/                 Research, architecture, threat model, and decisions
packages/core/        Dependency-free domain model and validation
packages/browser-adapter/ Browser metadata extraction prototype
ROADMAP.md            Milestones and execution plan
```

## Design principles

- Verify contact with an item, not merely that a person is human.
- Never put review text, receipts, or personal data directly on-chain.
- Use signatures and content hashes for integrity.
- Keep moderation appealable and auditable.
- Treat rewards as delayed and evidence-based.
- Prefer open protocols and portable identities over a proprietary chain.

## Local development

The core package uses Node's built-in test runner and requires Node.js 20 or newer.

```powershell
node --test packages/core/test/review.test.mjs
```

### Initial app demo

The repository includes a dependency-free local preview of the browser-extension experience. It simulates Verity detecting the entity on a shop, Google Maps, or YouTube page and injecting an independent, signed review panel:

```powershell
node demo/server.mjs
```

Open <http://127.0.0.1:4173> in a browser, click the Verity extension icon, and switch between the page scenarios. The demo is intentionally static, with a local-only review draft interaction; API, passkey, extension packaging, and signing integrations remain future MVP work.

## License

The license will be selected before the first public release.
