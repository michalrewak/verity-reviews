# Verity roadmap

## Phase 0 — foundation (current)

- [x] Capture the product thesis and non-goals.
- [x] Document market, legal, and technical constraints.
- [x] Define a portable review record.
- [x] Implement deterministic validation for the core record.
- [ ] Select a product name with an available `.com` domain and complete a trademark screen.
- [ ] Decide the project license and contribution policy.
- [x] Define deterministic identity rules for products, offers, places, and services.
- [ ] Validate the entity model against a broader corpus of real product and local-business URLs.

## Phase 1 — private MVP

- [x] Prototype the injected review experience for shop, map, and video pages.
- [ ] Package the prototype as a Manifest V3 browser extension with a side panel.
- [ ] Detect the active page type and extract candidate entity metadata.
- [ ] Resolve extracted metadata to a canonical Verity entity.
- [ ] Persist local drafts and signed review events in extension storage.
- [ ] Create a small API for products, places, and reviews.
- [ ] Add passkey-backed author keys.
- [x] Add review signing and content-addressed identifiers.
- [x] Add a browser metadata adapter that reads canonical product and place metadata.
- [ ] Connect the browser extension to the metadata adapter and API.
- [ ] Add a mobile share-sheet flow.
- [ ] Add evidence commitments without storing receipts in plaintext.

## Phase 2 — trust and moderation

- [ ] Add proof-of-contact adapters for receipts, orders, and venue visits.
- [ ] Add reputation points that cannot be transferred or sold.
- [ ] Add reviewer independence and sybil-risk signals.
- [ ] Add challenge periods, deposits, and appeal records.
- [ ] Publish moderation rules and an evidence-handling policy.

## Phase 3 — federation

- [ ] Define an interoperable signed-event format.
- [ ] Support multiple indexers and export/import.
- [ ] Add IPFS for selected public attachments.
- [ ] Anchor review hashes and dispute outcomes on an L2 only after usage validates the need.

## Economic layer — launch-critical track (runs in parallel from now)

Specification: [Economic layer](./docs/ECONOMIC-LAYER.md). Storage research: [Decentralized storage](./docs/DECENTRALIZED-STORAGE.md). Decision: [ADR 0001](./docs/adr/0001-token-is-launch-critical.md).

### E0 — mechanism design

- [x] Write the economic layer specification (assets, three reward pools, validation market, custody and delivery market, tiers, legal plan).
- [x] Research decentralized storage options and define the three-layer hosting architecture.
- [ ] Record the chain decision (Base vs. Arbitrum) as ADR 0002.
- [ ] Implement the rating-blind epoch scoring function in `packages/core` with tests proving it cannot read the rating.
- [ ] Build an agent-based attack simulation (sybil farm, merchant campaign, lazy validators, jury collusion, lazy hosts, self-dealing retrieval) and publish parameters where attacker ROI < 1.

### E1 — points ledger and node alpha

- [ ] Off-chain epoch scoring engine producing reproducible snapshots.
- [ ] Trust Score and personhood tiers 0–1.
- [ ] Author repository export/import for signed events.
- [ ] Desktop custody node alpha: shard assignment, keyed replicas, custody challenges.
- [ ] Takedown list format and tombstones.
- [ ] Pending/settled points surfaced in the extension.

### E2 — testnet

- [ ] `VerityToken`, `EmissionSchedule`, `RewardDistributor` on Base Sepolia.
- [ ] `ValidationMarket` with random assignment and commit/reveal.
- [ ] `CustodyRegistry` with node bonds, assignments, and takedown root.
- [ ] Delivery receipts in the extension and mobile client.
- [ ] `ChallengeCourt` v1 with appeals.
- [ ] Tier 2 personhood via World ID testnet.

### E3 — compliance and audit

- [ ] MiCA white paper and competent-authority notification.
- [ ] Review-disclosure, DSA, GDPR, node-operator liability, tax, and AML opinions.
- [ ] Two independent audits and a public bug bounty.

### E4 — TGE on Base mainnet

- [ ] Deploy token, emission, distributor, custody registry, bounties, governance.
- [ ] Convert testnet points into first-epoch allocations.
- [ ] Exercise emergency pause.

### E5 — decentralize

- [ ] Multi-attester reward roots with optimistic disputes.
- [ ] Decentralized custody challengers.
- [ ] Optional Kleros appeal integration.
- [ ] Parameter governance.

## Success criteria for the first public pilot

- A user can publish and export a signed review.
- A second client can verify it without trusting the original UI.
- A merchant cannot delete the record from all participating indexers.
- A user can remove personal evidence while preserving a non-reversible integrity proof.
- A review reward is not granted merely because the rating is positive.
- Epoch rewards are reproducible from the published snapshot by a third party.
- A simulated 1,000-key sybil farm earns less than it spends on stake and personhood attestations.
- A verified record stays retrievable with a third of its custody nodes offline, and a lazy host is caught by custody challenges in simulation.
