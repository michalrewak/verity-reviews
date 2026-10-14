# ADR 0001: The economic layer is launch-critical

Date: 2026-10-14
Status: accepted

## Context

The original roadmap gated a transferable token behind federation and treated it as optional. Review networks fail on cold start: without a credible reason for early contributors to seed long-tail entities, perform verification, and keep records online, there is no content for a second user to find. Points without stake cannot fund a security budget for challenges, juries, or hosting, and a single hosting company can be pressured into deleting reviews.

## Decision

Ship a transferable token (`VERA`, working name) with the first public deployment, together with a non-transferable Trust Score. Emission is split across three pools: contributions, verification, and custody/delivery. Rewards are rating-blind by construction, settle after a challenge window, and are capped per verified human. Verification, jury, and hosting work is staked and slashable. Users may host and serve verified records and are paid by importance-weighted proofs of custody and delivery.

## Consequences

- Mechanism design, attack simulation, decentralized-storage design, and MiCA work move onto the critical path and start now, in parallel with the extension.
- Scoring, custody challenges, and receipt aggregation must be reproducible from published snapshots so that reward roots can be disputed.
- The threat model gains reward farming, lazy hosting, and self-dealing retrieval as first-class, funded adversaries.
- A transferable asset and a hosting network increase regulatory, tax, audit, and operator-liability cost before launch; the roadmap budgets for two audits and legal opinions, including node-operator exposure.
- The rule "no payment for positive sentiment" is unchanged and enforced by excluding the review body and rating from scoring inputs.
