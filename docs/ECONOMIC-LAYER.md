# Economic layer

Status: **planned, launch-critical.** The token ships with the first public deployment. This document defines what is rewarded, how abuse is priced out, what runs on-chain, and the delivery order.

Working names: token **VERA** (ticker `VERA`), non-transferable reputation **Trust Score**. Final names follow the product-name decision in the roadmap.

## 1. Why a token is required for launch

- **Cold start.** Nobody writes reviews on an empty network. A public, rule-based emission schedule gives early contributors a reason to seed long-tail entities, evidence, and verifications before any merchant cares.
- **Security budget.** Challenges, juries, and anti-sybil attestations need stake that can be lost. Points in a database cannot be slashed in a way an attacker respects.
- **Neutrality.** An emission contract that no merchant and no single operator can redirect is the credible form of "merchants cannot buy their way in".
- **Infrastructure without a landlord.** Paying users to store and serve reviews means no single hosting company can be pressured into deleting them.
- **Funding.** A treasury allocation pays for audits, legal work, and indexer operators without advertising from the entities being reviewed.

The constraint that never moves: **VERA is never paid for the act of posting a review and never depends on the star rating.** It is paid for contributions that survive verification, for verification work, and for keeping verified records available.

## 2. Two assets, one gate

| Asset | Transferable | Earned by | Lost by | Used for |
|---|---|---|---|---|
| **VERA** (ERC-20) | yes | epoch rewards, winning challenges, bounties, custody and delivery | slashing of stake | stake, deposits, bounties, governance, merchant services |
| **Trust Score** (non-transferable, per key) | no | surviving verification over time, reliable hosting | upheld fraud findings, failed custody proofs | reward multiplier, validator and juror eligibility, rate limits, vote-weight caps |

Trust Score is the gate; VERA is the payout. A fresh wallet with a lot of VERA cannot out-earn a long-standing honest participant, and a high Trust Score cannot be cashed out directly, only through continued verified work.

## 3. Three ways to earn

Every epoch (weekly at launch) a fixed emission is split across three pools. The split is a governance parameter; the launch proposal is:

| Pool | Share at launch | Pays for |
|---|---|---|
| **Contribution** | 55 % | reviews, evidence, entity corrections, duplicate findings that survive the challenge window |
| **Verification** | 25 % | validator attestations and jury work that match final outcomes |
| **Custody and delivery** | 20 % | storing verified records with proven custody and serving them to real clients |

The custody share is expected to rise as the corpus grows and the contribution share to fall as the long tail fills in.

### 3.1 Contribution score

Each contribution `c` by key `k` in epoch `e` receives:

```text
score(c) = base(type) × evidence(c) × validation(c) × trust(k) × independence(c) × novelty(c)
```

| Factor | Range | Meaning |
|---|---|---|
| `base(type)` | fixed table | review, evidence attachment, entity correction, verification vote, dispute win, duplicate/merge finding |
| `evidence(c)` | 0.2 – 3.0 | none → issuer-signed proof of contact → zero-knowledge purchase/visit proof |
| `validation(c)` | 0 – 1.5 | independent validation outcome after the challenge window; 0 if successfully challenged |
| `trust(k)` | 0.1 – 2.0 | Trust Score multiplier; new keys start at 0.1 |
| `independence(c)` | 0 – 1 | graph/device/timing penalty for clustered or coordinated activity |
| `novelty(c)` | 0.25 – 1 | decays with the number of verified reviews already on the entity; first credible reviews of a long-tail entity are worth the most |

Epoch payout from a pool for key `k`:

```text
payout(k, e) = min( cap(k, e),  pool(e) × Σ score(c) / Σ_all score )
```

`cap(k, e)` is a per-human cap tied to the personhood tier (section 5). Capped remainders return to the pool.

### 3.2 Settlement delay

Payouts are claimable only after the **challenge window** (14 days at launch; 30 for high-value entities). A contribution successfully challenged inside the window scores 0 and reduces Trust Score. An attacker must therefore survive review by people who are paid to find them before anything is paid out.

### 3.3 Rating-neutrality rule

The scoring function has no access to the star rating or the review text. The engine receives the review `contentId`, evidence descriptors, validation outcomes, graph features, and custody/delivery proofs, never the body. This is enforced by the input schema and covered by tests.

### 3.4 Record importance

Both verification and custody rewards are weighted by a per-record **importance** value, so the network spends its budget on what matters:

```text
importance(r) = validation(r) × evidence(r) × demand(r) × scarcity(r)
```

- `demand(r)`: verified retrieval receipts in recent epochs (section 4.3), log-scaled;
- `scarcity(r)`: `target_replicas / current_replicas`, capped at 1 once the replication target is met, so hosting the millionth copy of a popular record earns nothing while the seventh copy of a rare one earns in full.

## 4. Custody and delivery market

This is the mechanism that lets users, not a hosting company, keep reviews online, and earn for it. Design rationale and protocol comparison: [Decentralized storage](./DECENTRALIZED-STORAGE.md).

### 4.1 Roles

| Role | Runs on | Earns for |
|---|---|---|
| **Author repository** | the author's own devices and chosen mirrors | nothing extra; authors always hold their own signed events (portability, not income) |
| **Custody node** | desktop companion, home server, VPS | proven storage of assigned record shards, weighted by importance |
| **Delivery node** | custody nodes and mobile hot caches on Wi-Fi | serving records to real clients, proven by signed receipts |
| **Attester** | operator set at launch, decentralized in E5 | issuing custody challenges, auditing deliveries, publishing epoch roots |

A node can play several roles. Mobile devices are expected to earn mostly from delivery of a small hot cache, not from bulk custody.

### 4.2 Proof of custody

- Records are erasure-coded into shards; each shard is assigned to `target_replicas` nodes chosen by a verifiable random function over node IDs, so nodes cannot pick only popular data.
- Every epoch, attesters issue random **custody challenges**: a nonce plus a shard reference. The node must answer with `hash(nonce ‖ shard ‖ node_key)` inside a short window. Replicas are stored under a per-node keyed encoding, so a node cannot answer by fetching the shard from a peer at challenge time.
- Passing challenges accrue custody score `= Σ importance(shard) × uptime(node)`; failing a challenge forfeits the epoch's custody reward for that shard and dents Trust Score; repeated failure triggers reassignment and lazy repair from remaining replicas.
- Custody nodes post a small **node bond** in VERA. Bonds are slashed for serving tampered content (detected by content-ID mismatch at the client) or for serving records on the active takedown list.

### 4.3 Proof of delivery

- A client that fetches a record signs a **delivery receipt** `(contentId, nodeId, clientKey, epoch)`.
- Receipts are deduplicated per `(client, record, epoch)` and weighted by the client's personhood tier; tier-0 receipts count for nothing. This makes self-dealing (requesting your own data from your own node) cost real humans, not scripts.
- Attesters run random **audit retrievals** from anonymous vantage points; nodes that advertise shards but fail audits lose delivery rewards for the epoch.
- Delivery score `= Σ importance(record) × tier_weight(client)`, capped per `(node, client)` pair.

### 4.4 Legality and takedowns

- Only records that passed intake policy are eligible for assignment. Evidence (receipts, photos) is never placed in the public swarm; only review events, entity records, and hashes are.
- Moderation outcomes publish a signed **takedown list**: nodes must stop serving listed content IDs within one epoch but keep the hash-only tombstone. Serving listed content after the grace period is slashable; hosting the tombstone remains rewarded.
- Personal data is never in the stored payload, so GDPR erasure requests are resolved by takedown-plus-tombstone rather than by attempting to delete from every peer.

## 5. Verification market

### 5.1 Validators

- Any key with Trust Score above a threshold may stake VERA to become a validator.
- Contributions needing validation are assigned to a **random** subset of eligible validators (seeded from a verifiable source), never self-selected.
- Validators submit **commit → reveal** attestations: `supported`, `unsupported`, `policy_violation`, `abstain`, with a reason code. Commit/reveal prevents herding toward the visible majority.

### 5.2 Outcomes

| Validator voted | Result |
|---|---|
| with the final outcome | share of verification pool + Trust Score increase |
| against the final outcome | small slash (2–5 % of assigned stake) + Trust Score decrease |
| abstain | no reward, no slash; Trust Score decay if habitual |
| did not reveal | full assignment slash |

### 5.3 Challenges and disputes

- Anyone can **challenge** a contribution, a validation outcome, or an epoch root by posting a deposit.
- Challenged items go to a larger, freshly randomized jury with higher stake. The loser's deposit pays the jury and the winner.
- Appeals double the jury size and the deposit. After the final round the outcome is recorded on-chain and is binding for the scoring engine.
- Juries decide only **objective policy questions**: fake evidence, duplicate account, plagiarism, impersonation, prohibited data, coordinated voting, failed custody. "I disagree with the opinion" is rejected at intake.

Option kept open: route the final appeal layer to Kleros Court once volume justifies it.

## 6. Sybil resistance tiers

| Tier | Requirement | Epoch reward cap | Validator | Custody node |
|---|---|---|---|---|
| 0 | passkey only | 0 | no | no |
| 1 | tier 0 + phone/device attestation + 30-day probation | low | no | yes, with bond |
| 2 | tier 1 + proof of unique personhood (World ID or equivalent) | standard | yes | yes |
| 3 | tier 2 + ≥ N verified proof-of-contact credentials | high | yes, jury-eligible | yes |

One human can hold many keys, but only one key carries the tier-2 personhood attestation at a time, with a rotation cooldown. Farm size is bounded by real humans, and caps bound what each human can extract. Custody nodes are bounded by bond, not by personhood, because storage is cheap to verify directly.

## 7. Token design

### 7.1 Chain

**Recommendation: Base (OP Stack L2).** Sub-cent fees for epoch claims, receipts, and challenges; EVM tooling; native ERC-4337 smart-wallet support so users sign with the passkeys that already sign their reviews. Alternatives: Arbitrum One (Kleros v2 lives there), Polygon PoS, Solana. Recorded as ADR 0002 before contracts are written.

### 7.2 Supply and allocation (proposal, subject to simulation and legal review)

Fixed supply **1,000,000,000 VERA**, no inflation beyond the schedule.

| Bucket | Share | Release |
|---|---|---|
| Epoch emission (all three pools) | 45 % | emission contract, 10 years, ≈ 20 % in year 1 then geometric decay |
| Ecosystem, indexer and node grants | 12 % | DAO-controlled, 5 years |
| Treasury (audits, legal, operations) | 15 % | timelock, published budget |
| Team and early builders | 15 % | 12-month cliff, 48-month linear |
| Early backers | 8 % | 6-month cliff, 36-month linear |
| Liquidity | 5 % | TGE, locked LP |

Testnet points (phases E1–E2) convert into a share of the first emission epochs, so early contributors and early node operators are paid from the emission bucket, not from a separate airdrop.

### 7.3 Demand side

Sinks, all denominated in VERA: validator and jury stake; challenge and appeal deposits; custody node bonds; **entity bounties** (anyone may fund; merchants only with public disclosure, never rating-conditional, never revocable after funding); merchant verified-response and analytics API fees (treasury, with a governance-set buyback-to-emission policy); indexer registration bonds.

### 7.4 Contracts (Solidity, Foundry, OpenZeppelin)

| Contract | Responsibility | Upgradeability |
|---|---|---|
| `VerityToken` | ERC-20 + Votes + permit | immutable |
| `EmissionSchedule` | releases per-epoch emission and pool split | immutable |
| `RewardDistributor` | epoch Merkle roots, claims after window, caps | immutable; roots posted by attesters |
| `TrustRegistry` | Trust Score and personhood tiers per key | UUPS behind timelock |
| `ValidationMarket` | validator stake, random assignment, commit/reveal, slashing | UUPS behind timelock |
| `CustodyRegistry` | node bonds, shard assignments, challenge outcomes, takedown list root | UUPS behind timelock |
| `ChallengeCourt` | deposits, jury rounds, appeals, binding outcomes | UUPS behind timelock |
| `BountyVault` | entity bounties with disclosure flags | immutable |
| `Treasury` + `Governor` + `Timelock` | parameters, budgets, attester set | standard OZ governance |

Epoch scoring, custody challenges, and receipt aggregation run off-chain at launch. On-chain: the epoch root, the input snapshot's content ID, and the scoring version hash, so anyone can recompute and dispute a root during its own window. Decentralizing attesters is phase E5.

## 8. Legal and compliance plan (EU first)

1. **MiCA classification.** Target: utility token (other than ART/EMT). White paper notified to the home competent authority (KNF for a Polish issuer) before public offering; marketing rules; issuer obligations. Confirm whether the points-to-TGE conversion counts as an offer.
2. **No return promises.** VERA is documented as a utility for staking, deposits, bounties, node bonds, and governance. Emission is for work performed.
3. **Review-disclosure law.** EU consumer rules (Omnibus Directive, UOKiK guidance) require stating whether and how reviews are verified and whether they are incentivized. Verity publishes the scoring rules, labels rewarded contributions, and labels merchant-funded bounties on the entity page.
4. **DSA.** Notice-and-action, statement of reasons, and appeals; the on-chain outcome record coexists with the takedown list for display.
5. **GDPR.** Nothing personal on-chain or in the public swarm: keys, hashes, content IDs, scores. Evidence stays off-chain under user control. Document the lawful basis for graph/independence signals and for delivery receipts (which reveal who read what to attesters; receipts are therefore pseudonymous and aggregated before publication).
6. **Hosting liability.** Custody nodes are intermediaries serving content-addressed data they did not author; the takedown-list mechanism is what makes "expeditious removal" possible. Obtain an opinion on node-operator exposure in the EU and publish it to operators.
7. **Tax and reporting.** Rewards are income for recipients; exportable claim histories; evaluate DAC8 obligations for the operator.
8. **AML.** No exchange or custody of user funds; confirm no CASP licence is triggered by the distributor, bounty vault, or node bonds.
9. **Audits.** Two independent smart-contract audits plus a public bug bounty before mainnet.

## 9. Delivery phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **E0 — mechanism design** | this document, ADR for chain, scoring spec, agent-based attack simulation (sybil farm, merchant campaign, lazy validators, jury collusion, lazy hosts, self-dealing retrieval) | simulation shows attacker ROI < 1 under planned parameters; parameters published |
| **E1 — points ledger** | off-chain epoch scoring engine, rating-blind by construction; Trust Score; tiers 0–1; desktop custody node alpha with custody challenges; points visible in the extension | 4 consecutive reproducible epochs; ≥ 50 custody nodes passing challenges |
| **E2 — testnet** | contracts on Base Sepolia; Merkle claims; validation market; challenge court v1; custody registry and takedown list; delivery receipts; tier 2 via World ID testnet | 500+ contributors, slashing exercised, one attempted farm and one lazy host caught |
| **E3 — compliance and audit** | MiCA white paper, legal opinions incl. node-operator exposure, two audits, bug bounty, DAO setup | notification filed; audit findings closed |
| **E4 — TGE on Base mainnet** | token, emission, distributor, custody registry, bounties, governance; points conversion; liquidity | first mainnet epoch paid to contributors, validators, and nodes; emergency pause tested |
| **E5 — decentralize** | multi-attester roots with optimistic disputes, decentralized custody challengers, Kleros appeal option, parameter governance | no single party can post an uncontested root or challenge set |

E0–E1 start now, alongside the extension work. E2 depends on the API and passkey keys from product phase 1.

## 10. Circuit breakers and KPIs

- **Pause**: emission pauses automatically if upheld challenges exceed a governance threshold (initially 5 % of rewarded contributions in an epoch) or if audit-retrieval failure exceeds 20 %.
- **Per-entity cap**: no entity absorbs more than a small share of an epoch's contribution pool.
- **Per-record replication cap**: custody rewards stop at the replication target.
- **Validator liveness**: if reveal rate drops below 80 %, assignment size and stakes rise.
- KPIs: verified-contact share of rewarded reviews; challenge and upheld-challenge rates; median settlement time; reward concentration (Gini across tier-2 humans and across nodes); replica count distribution for the long tail; audit-retrieval success; share of claimed rewards sold within 7 days.

## 11. Open decisions

1. Final names for token and reputation (coupled to the product-name decision).
2. Base vs. Arbitrum; own court vs. Kleros appeals.
3. Epoch length, challenge window, replication target, and pool split after simulation.
4. Whether to build the custody layer on raw libp2p/IPFS primitives or adopt a Swarm/Codex-style erasure-coded client and only add the VERA incentive layer.
5. Whether merchant bounties are allowed at TGE or deferred until independence signals are proven.
6. Issuer entity and jurisdiction for the MiCA notification.
