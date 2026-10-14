# Threat model

## Adversaries

- bot farms creating many accounts;
- merchants or competitors coordinating positive or negative campaigns;
- users fabricating receipts;
- jurors colluding to move rewards;
- abusive users publishing personal data or defamatory claims;
- an indexer or UI selectively hiding records;
- token speculators farming rewards rather than improving information.

## Controls

| Threat | Initial control | Later control |
|---|---|---|
| Sybil accounts | passkeys, rate limits, graph signals | proof-of-personhood and zero-knowledge uniqueness |
| Fake contact evidence | issuer signatures and delayed review | verifiable credentials |
| Collusive voting | reviewer independence weighting | randomized juries and commit/reveal |
| Selective hiding | signed export and audit log | multiple indexers |
| Defamation/PII | report and appeal workflow | policy registry and external dispute providers |
| Reward farming | rating-blind scoring, challenge-window settlement, per-human caps by personhood tier | staked validation with slashing, per-entity emission caps, automatic emission pause |
| Validator herding or collusion | random assignment, commit/reveal | appeal rounds with fresh juries, optional external court |
| Lazy or sybil hosts | keyed replicas, random custody challenges, node bonds, replication-target cap | decentralized challengers, lazy repair |
| Self-dealing retrieval | tier-weighted delivery receipts, per-pair caps | audit retrievals from anonymous vantage points |
| Merchant-funded bounties steering ratings | bounties disclosed on the entity page and never rating-conditional | independence signals gate merchant bounties |

The economic controls are specified in [Economic layer](./ECONOMIC-LAYER.md) and [Decentralized storage](./DECENTRALIZED-STORAGE.md).

## Non-goals

- guaranteeing that subjective opinions are objectively true;
- making unlawful content permanently available;
- identifying every user publicly;
- replacing courts or consumer-protection authorities;
- paying users for favorable ratings.
