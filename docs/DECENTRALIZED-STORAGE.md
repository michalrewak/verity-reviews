# Decentralized storage and delivery

Research note supporting section 4 of [Economic layer](./ECONOMIC-LAYER.md): can users, rather than a hosting company, keep reviews online, and be paid for it?

## 1. Requirements specific to reviews

- Records are **small** (a signed review event is a few kilobytes) and **numerous**; most storage networks are tuned for large blobs.
- Importance is uneven: a verified review of a long-tail local business is worth far more to the network than the thousandth review of a flagship phone.
- Content must be **removable from display** for legal reasons while its integrity proof survives.
- Writers are ordinary users on laptops and phones; hosting cannot require a data-centre operator, but it also cannot drain a phone battery.
- The reward must be paid in the same unit as everything else (`VERA`), and weighted by Verity's own validation data, which no external network knows about.

## 2. Protocols reviewed

| Protocol | Storage proof | Pays for bandwidth | Unit | Fit for Verity |
|---|---|---|---|---|
| **IPFS** (content addressing, pinning) | none built in; pinning is voluntary or paid off-protocol; unpinned data is garbage-collected | no | — | Addressing layer. Verity `contentId` (SHA-256 of canonical JSON) maps directly to a raw-codec CID, so records are IPFS-retrievable with no translation. Needs an incentive layer on top. |
| **Filecoin** | sealed sectors with proof of replication and daily proof of spacetime; separate retrieval market | retrieval deals | FIL | Strong for cold archive of epoch snapshots via an aggregator; too heavy for per-record hosting on user devices. |
| **Swarm** | postage stamps prepay storage; a redistribution game pays staking nodes that honestly store randomly sampled neighbourhoods; a price oracle adjusts stamp price to redundancy | yes, SWAP accounting with chequebook settlement on Gnosis Chain | xBZZ | Closest existing design to "earn for storing and relaying". Both incentive ideas are reused, but paying hosts in xBZZ and buying stamps from treasury would detach hosting rewards from Verity's importance weighting. |
| **Codex** | erasure-coded data with proof of retrievability and lazy repair | planned | — | Promising erasure-coding and repair model; early-stage, API stability unknown. Candidate client library rather than a dependency. |
| **Arweave** | endowment-funded permanent storage, proof of access | no | AR | Permanence is a liability for removable content; acceptable only for hash-only index snapshots. |
| **Walrus** (Sui) | erasure-coded blobs with on-chain availability certificates | no | WAL | Blob-oriented and tied to a different chain; not aligned with a Base-based design. |
| **Hypercore / Pear** | signed append-only logs replicated peer-to-peer | no | — | Excellent fit for the **author repository** layer (each author owns a signed log of their events); no incentives, no availability guarantees beyond who chooses to replicate. |
| **AT Protocol** | signed user repositories hosted on personal data servers with relays and app views | no | — | Federation reference model: portability and independent app views. Hosting remains server-based rather than user-device-based. |

Conclusion: no existing network gives Verity-weighted, VERA-denominated hosting rewards with legal takedown semantics. The pragmatic design is a **three-layer system**: author repositories for portability, a Verity swarm with its own incentive layer for availability, and cold archives on Filecoin/Arweave for hash-only snapshots.

## 3. Proposed architecture

```text
Author repository (Hypercore-style signed log; author's devices + chosen mirrors)
        │ publish signed events
        ▼
Verity swarm (libp2p / IPFS-compatible CIDs)
   ├── custody nodes: erasure-coded shards, keyed replicas, random custody challenges
   ├── delivery nodes: hot caches, signed delivery receipts
   └── takedown list: signed, per-epoch, tombstones instead of deletion
        │ epoch snapshot CIDs + roots
        ▼
Cold archive (Filecoin deals / Arweave) — hashes and index snapshots only
        │
        ▼
Base L2 — custody registry, bonds, epoch roots, slashing, rewards
```

### Why keyed replicas

A node challenged for a shard could fetch it from a peer and answer late. Filecoin solves this with expensive sealing; Verity needs something a laptop can do. Each assigned replica is stored under a cheap per-node keyed transform (`shard ⊕ KDF(node_key, shard_id)`), and the challenge response hashes the keyed form. A node without the keyed replica would have to fetch the plain shard and re-encode within the challenge window; the window and per-epoch sampling rate are set in simulation so this is unprofitable at scale.

### Why erasure coding

Reviews are small, so each record is bundled into fixed-size blocks per entity and epoch, then erasure-coded (for example 8-of-12). A record stays retrievable with a third of its hosts offline, and repair only needs any 8 shards, which keeps mobile churn from causing data loss.

### Why receipts rather than metering

Bandwidth cannot be proven; it can only be attested by the receiver. Receipts signed by tier-weighted clients plus random audit retrievals give an approximation that is expensive to fake: faking demand requires real humans with personhood attestations, and advertising data you cannot serve is caught by audits.

## 4. Earning model for hosts

| Device class | Expected role | Earns mainly from |
|---|---|---|
| Phone | hot cache of a few MB on Wi-Fi only; no custody | delivery receipts in its area or interests |
| Laptop / desktop companion | custody of assigned shards while online; delivery | custody challenges × importance; delivery |
| Home server / NAS / small VPS | full custody node, high uptime | custody; audit-verified delivery |
| Indexer operator | custody plus search index; bonded | custody, delivery, indexer grants |

Importance weighting (validation × evidence × demand × scarcity) is what keeps this honest: a node earns for the rare, verified, requested records it keeps alive, not for hoarding popular data, and nothing once a record already has its target number of replicas.

## 5. Attacks and mitigations

| Attack | Mitigation |
|---|---|
| Lazy host (claims storage, fetches on demand) | keyed replicas, short challenge windows, random sampling, bond slashing |
| Host sybils to collect many assignments | bond per node; assignment via VRF over bonded node IDs; rewards capped by importance and replication target, so extra nodes on the same data earn nothing |
| Self-dealing retrieval | receipts weighted by client personhood tier; per-(node, client) caps; audit retrievals |
| Serving tampered content | content-ID verification at the client; reported mismatches slash the bond |
| Serving taken-down content | signed takedown list with grace period; slashable after the period; tombstone hosting still rewarded |
| Hosting unlawful or personal data | only intake-approved events in the swarm; evidence never enters the swarm; takedown-plus-tombstone instead of deletion |
| Correlating readers | receipts are pseudonymous, aggregated by attesters, and only aggregates are published |
| Attester censorship or bias | roots are disputable; attester set decentralizes in E5 |

## 6. What to build first

1. Author repository export/import for signed events (portability without any token).
2. Desktop custody node alpha: shard assignment, keyed replicas, custody challenges, local earnings estimate.
3. Takedown list format and tombstones.
4. Delivery receipts in the extension and mobile client.
5. Custody registry contract on Base Sepolia.

## 7. Open questions

- Build on raw libp2p/IPFS primitives, or adopt a Codex/Swarm-style client and add only the incentive layer?
- Replication target and block size per entity class.
- Whether phones should ever hold custody shards, or only deliver.
- How delivery receipts interact with reader privacy under GDPR; whether to use blind signatures.
