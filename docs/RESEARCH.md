# Research summary

## Product gap

Google Maps, Yelp, Tripadvisor, Trustpilot, and retailer review systems provide reach but retain control of ranking, moderation, account access, and availability. Verity targets the portability and auditability gap rather than trying to replace every discovery platform on day one.

## Relevant prior art

- [Google contribution policy](https://support.google.com/contributionpolicy/answer/7400114): genuine experience is required and paid or incentivized reviews are prohibited. This is why Verity must not pay for positive sentiment.
- [Kleros Curate](https://docs.kleros.io/products/curate): token-curated registries use deposits, challenges, and jurors. This is useful prior art for data disputes, not proof that a subjective opinion is objectively true.
- [IPFS](https://ipfs.tech/): content identifiers make changes detectable, but availability still depends on nodes or pinning.
- [Arweave](https://www.arweave.org/): useful for durable public archives, but permanent storage conflicts with personal-data deletion requirements.
- [DID Core](https://www.w3.org/TR/did/) and [Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/): standards for portable identifiers and selective disclosure.
- [AT Protocol](https://atproto.com/guides/overview): signed, portable user repositories and independent app views are a strong alternative to putting all data on a blockchain.
- [World ID](https://world.org/world-id): proof of unique human can reduce sybil attacks, but it does not prove a purchase or the truth of a review.
- [Digital Services Act](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act): requires transparent handling of illegal-content reports, moderation explanations, and appeals in covered services.
- [ESMA MiCA register](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica): a transferable token requires legal classification and a compliance plan in the EU.

## Key conclusion

The hard problem is not storing a review. It is proving that the reviewer had a relevant experience while preserving privacy and preventing the verification market itself from becoming a new attack surface.

## Recommended trust layers

1. **Integrity:** author signature, timestamp, content hash.
2. **Object identity:** product GTIN/EAN/SKU, place identity, canonical URLs, and aliases.
3. **Contact evidence:** receipt, order, visit, repair, ticket, or issuer credential.
4. **Human uniqueness:** passkeys, rate limits, device signals, and optional proof-of-personhood.
5. **Quality:** time-delayed peer feedback and independence-weighted reputation.
6. **Dispute:** deposits, evidence rules, juror selection, and appeal.

No single layer should be presented as proof of truth.
