# Verity roadmap

## Phase 0 — foundation (current)

- [x] Capture the product thesis and non-goals.
- [x] Document market, legal, and technical constraints.
- [x] Define a portable review record.
- [x] Implement deterministic validation for the core record.
- [ ] Decide the project license and contribution policy.
- [ ] Validate the entity model against real product and local-business URLs.

## Phase 1 — private MVP

- [ ] Create a small API for products, places, and reviews.
- [ ] Add passkey-backed author keys.
- [ ] Add review signing and content-addressed identifiers.
- [ ] Add a browser extension that reads canonical product metadata.
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

## Phase 4 — economic layer (gated)

- [ ] Commission legal analysis for EU consumer, privacy, DSA, and MiCA obligations.
- [ ] Model attack economics and reward sustainability.
- [ ] Run an economic testnet with non-transferable credits first.
- [ ] Decide whether a transferable asset is necessary at all.

## Success criteria for the first public pilot

- A user can publish and export a signed review.
- A second client can verify it without trusting the original UI.
- A merchant cannot delete the record from all participating indexers.
- A user can remove personal evidence while preserving a non-reversible integrity proof.
- A review reward is not granted merely because the rating is positive.
