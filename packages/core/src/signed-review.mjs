import { validateReview } from "./review.mjs";
import { decodeEd25519DidKey } from "./did-key.mjs";

const EVENT_KIND = "verity.review";
const EVENT_VERSION = 1;
const SIGNATURE_ALGORITHM = "Ed25519";

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export async function createSignedReviewEvent(review, privateKey, cryptoProvider = globalThis.crypto) {
  const errors = validateReview(review);
  if (errors.length > 0) {
    throw new TypeError(`review is invalid: ${errors.join("; ")}`);
  }
  requireCrypto(cryptoProvider);

  const payload = {
    kind: EVENT_KIND,
    version: EVENT_VERSION,
    review
  };
  const bytes = new TextEncoder().encode(canonicalJson(payload));
  const [digest, signature] = await Promise.all([
    cryptoProvider.subtle.digest("SHA-256", bytes),
    cryptoProvider.subtle.sign(SIGNATURE_ALGORITHM, privateKey, bytes)
  ]);

  return {
    ...payload,
    contentId: `sha256:${toHex(digest)}`,
    signature: {
      algorithm: SIGNATURE_ALGORITHM,
      keyId: review.authorKeyId,
      value: toBase64Url(signature)
    }
  };
}

export async function verifySignedReviewEvent(event, publicKey, cryptoProvider = globalThis.crypto) {
  const errors = validateSignedReviewEvent(event);
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  requireCrypto(cryptoProvider);

  const payload = {
    kind: event.kind,
    version: event.version,
    review: event.review
  };
  const bytes = new TextEncoder().encode(canonicalJson(payload));
  const digest = `sha256:${toHex(await cryptoProvider.subtle.digest("SHA-256", bytes))}`;
  if (digest !== event.contentId) {
    errors.push("contentId does not match the event payload");
  }

  const signatureIsValid = await cryptoProvider.subtle.verify(
    SIGNATURE_ALGORITHM,
    publicKey,
    fromBase64Url(event.signature.value),
    bytes
  );
  if (!signatureIsValid) {
    errors.push("signature is invalid");
  }

  return { valid: errors.length === 0, errors };
}

export async function verifyReviewEventSignature(event, cryptoProvider = globalThis.crypto) {
  const errors = validateSignedReviewEvent(event);
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  requireCrypto(cryptoProvider);

  let publicKey;
  try {
    publicKey = await cryptoProvider.subtle.importKey(
      "raw",
      decodeEd25519DidKey(event.review.authorKeyId),
      { name: SIGNATURE_ALGORITHM },
      false,
      ["verify"]
    );
  } catch (error) {
    return {
      valid: false,
      errors: [`author key cannot be resolved from authorKeyId: ${error.message}`]
    };
  }

  return verifySignedReviewEvent(event, publicKey, cryptoProvider);
}

export function validateSignedReviewEvent(event) {
  if (!event || typeof event !== "object") {
    return ["event must be an object"];
  }

  const errors = validateReview(event.review);
  if (event.kind !== EVENT_KIND) {
    errors.push(`kind must be ${EVENT_KIND}`);
  }
  if (event.version !== EVENT_VERSION) {
    errors.push(`version must be ${EVENT_VERSION}`);
  }
  if (typeof event.contentId !== "string" || !/^sha256:[0-9a-f]{64}$/.test(event.contentId)) {
    errors.push("contentId must be a SHA-256 identifier");
  }
  if (!event.signature || typeof event.signature !== "object") {
    errors.push("signature is required");
    return errors;
  }
  if (event.signature.algorithm !== SIGNATURE_ALGORITHM) {
    errors.push(`signature algorithm must be ${SIGNATURE_ALGORITHM}`);
  }
  if (event.signature.keyId !== event.review?.authorKeyId) {
    errors.push("signature keyId must match review authorKeyId");
  }
  if (
    typeof event.signature.value !== "string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(event.signature.value)
  ) {
    errors.push("signature value must be a 64-byte Ed25519 signature encoded as unpadded base64url");
  }

  return errors;
}

function canonicalValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("canonical JSON does not support non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("canonical JSON supports only plain objects");
    }

    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) {
        throw new TypeError("canonical JSON does not support undefined values");
      }
      result[key] = canonicalValue(value[key]);
    }
    return result;
  }

  throw new TypeError(`canonical JSON does not support ${typeof value}`);
}

function requireCrypto(cryptoProvider) {
  if (!cryptoProvider?.subtle) {
    throw new TypeError("a Web Crypto provider is required");
  }
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(buffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
