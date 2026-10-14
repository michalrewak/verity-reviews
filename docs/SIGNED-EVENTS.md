# Signed review events

Verity review events are portable JSON records that can be verified independently of the API or user interface that distributed them.

## Envelope

```json
{
  "kind": "verity.review",
  "version": 1,
  "review": {},
  "contentId": "sha256:<64 lowercase hexadecimal characters>",
  "signature": {
    "algorithm": "Ed25519",
    "keyId": "did:key:...",
    "value": "<unpadded base64url>"
  }
}
```

The signed payload contains only `kind`, `version`, and `review`. `contentId` is the SHA-256 digest of the same canonical payload. The signature is Ed25519 over the canonical payload bytes.

## Canonical representation

- UTF-8 JSON;
- object keys sorted lexicographically at every depth;
- array order preserved;
- finite JSON numbers only;
- no `undefined`, functions, symbols, class instances, or non-JSON values;
- no insignificant whitespace.

These rules ensure that independent clients produce the same bytes for equivalent event data.

## Key handling

The `signature.keyId` must equal `review.authorKeyId`. The format supports DID key identifiers but does not require a single DID method.

Private keys must remain in platform key storage:

- passkey/authenticator or OS keystore on end-user devices;
- non-exportable Web Crypto keys where passkeys are unavailable;
- hardware-backed service keys for trusted issuers.

Key resolution, rotation, and revocation are separate protocol concerns. A valid mathematical signature proves control of a key at signing time; it does not by itself prove that the signer is a unique human or had contact with the reviewed entity.

## Revisions

Review records carry a positive `revision`. An edit creates a new signed event; it never mutates an already signed event. The review ID stays stable while the revision increases. Indexers should retain revision history and reject conflicting events with the same review ID and revision until a conflict policy is defined.
