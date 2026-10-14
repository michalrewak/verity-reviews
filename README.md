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

Phase 1 private MVP implementation. The API, unpacked Manifest V3 extension, and
mobile Web Share Target are intended for local development and private testing.

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
packages/api/         Local JSON-backed products, places, and reviews API
packages/browser-extension/ Manifest V3 side-panel extension source
packages/mobile-share/ Installable mobile Web Share Target
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

The packages use Node's built-in test runner and require Node.js 20 or newer.

```powershell
node --test packages/core/test/*.test.mjs
node --test packages/browser-adapter/test/*.test.mjs
node --test packages/api/test/*.test.mjs
node --test packages/mobile-share/test/*.test.mjs
```

### Private MVP

Start the local API:

```powershell
node packages/api/src/server.mjs
```

The API listens on `http://127.0.0.1:8787` and writes its local state to
`data/verity.json`. Set `VERITY_DATA_FILE` to change the location and
`VERITY_ALLOWED_ORIGINS` to a comma-separated list when hosting a client on
another origin.

Build the browser extension:

```powershell
node packages/browser-extension/scripts/build.mjs
```

Load `packages/browser-extension/dist` as an unpacked extension in a
Chromium-based browser. Opening its side panel extracts product/place metadata
from the active tab, resolves the canonical entity through the API, restores
local drafts, and publishes passkey-authorized Ed25519 events. A selected
evidence file is reduced to a salted SHA-256 commitment in memory; the file is
not stored or uploaded. The random commitment opening remains only in local
extension storage so the author can later disclose it with the evidence.

Start the installable mobile share target:

```powershell
node packages/mobile-share/server.mjs
```

Open `http://127.0.0.1:4174`, install it as a PWA, and share an indexed product
or place URL to Verity. The mobile flow resolves the URL and stores an unsigned
private draft on that device.

### Static interface demo

The repository includes a dependency-free local preview of the browser-extension experience. It simulates Verity detecting the entity on a shop, Google Maps, or YouTube page and injecting an independent, signed review panel:

```powershell
node demo/server.mjs
```

Open <http://127.0.0.1:4173> in a browser, click the simulated Verity extension
icon, and switch between the page scenarios. This is a static visual demo; use
the Manifest V3 package above for the integrated MVP.

## License

The license will be selected before the first public release.
