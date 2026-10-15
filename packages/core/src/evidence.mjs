export async function createEvidenceCommitment(
  evidence,
  nonce,
  cryptoProvider = globalThis.crypto
) {
  requireCrypto(cryptoProvider);
  const evidenceBytes = toBytes(evidence, "evidence");
  const nonceBytes = toBytes(nonce, "nonce");
  if (evidenceBytes.byteLength === 0) {
    throw new TypeError("evidence must not be empty");
  }
  if (nonceBytes.byteLength < 16) {
    throw new TypeError("nonce must contain at least 16 bytes");
  }

  const framed = new Uint8Array(8 + evidenceBytes.byteLength + nonceBytes.byteLength);
  const view = new DataView(framed.buffer);
  view.setUint32(0, evidenceBytes.byteLength);
  framed.set(evidenceBytes, 4);
  view.setUint32(4 + evidenceBytes.byteLength, nonceBytes.byteLength);
  framed.set(nonceBytes, 8 + evidenceBytes.byteLength);

  const digest = await cryptoProvider.subtle.digest("SHA-256", framed);
  return `sha256:${toHex(digest)}`;
}

export function createEvidenceNonce(cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.getRandomValues) {
    throw new TypeError("a Web Crypto provider with getRandomValues is required");
  }
  return cryptoProvider.getRandomValues(new Uint8Array(32));
}

function toBytes(value, label) {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`${label} must be a string, ArrayBuffer, or typed array`);
}

function requireCrypto(cryptoProvider) {
  if (!cryptoProvider?.subtle) {
    throw new TypeError("a Web Crypto provider is required");
  }
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
