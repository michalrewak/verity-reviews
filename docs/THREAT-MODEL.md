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
| Reward farming | no transferable token, delayed points | stake and slashing with audited parameters |

## Non-goals

- guaranteeing that subjective opinions are objectively true;
- making unlawful content permanently available;
- identifying every user publicly;
- replacing courts or consumer-protection authorities;
- paying users for favorable ratings.
