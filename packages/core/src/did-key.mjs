const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ED25519_MULTICODEC = Object.freeze([0xed, 0x01]);
const ED25519_PUBLIC_KEY_BYTES = 32;

export function encodeEd25519DidKey(publicKey) {
  const key = toBytes(publicKey);
  if (key.byteLength !== ED25519_PUBLIC_KEY_BYTES) {
    throw new TypeError("an Ed25519 public key must contain 32 bytes");
  }

  const prefixed = new Uint8Array(ED25519_MULTICODEC.length + key.byteLength);
  prefixed.set(ED25519_MULTICODEC, 0);
  prefixed.set(key, ED25519_MULTICODEC.length);
  return `did:key:z${base58Encode(prefixed)}`;
}

export function decodeEd25519DidKey(value) {
  if (typeof value !== "string" || !value.startsWith("did:key:z")) {
    throw new TypeError("author key must be a base58btc did:key identifier");
  }

  const decoded = base58Decode(value.slice("did:key:z".length));
  if (decoded[0] !== ED25519_MULTICODEC[0] || decoded[1] !== ED25519_MULTICODEC[1]) {
    throw new TypeError("did:key must use the Ed25519 multicodec prefix");
  }

  const key = decoded.subarray(ED25519_MULTICODEC.length);
  if (key.byteLength !== ED25519_PUBLIC_KEY_BYTES) {
    throw new TypeError("did:key must encode a 32-byte Ed25519 public key");
  }
  return new Uint8Array(key);
}

export function isEd25519DidKey(value) {
  try {
    decodeEd25519DidKey(value);
    return true;
  } catch {
    return false;
  }
}

function base58Encode(bytes) {
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros += 1;
  }

  const digits = [0];
  for (let index = leadingZeros; index < bytes.length; index += 1) {
    let carry = bytes[index];
    for (let digit = 0; digit < digits.length; digit += 1) {
      carry += digits[digit] * 256;
      digits[digit] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  return (
    "1".repeat(leadingZeros) +
    digits
      .reverse()
      .map((digit) => BASE58_ALPHABET[digit])
      .join("")
  );
}

function base58Decode(value) {
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === "1") {
    leadingZeros += 1;
  }

  const bytes = [0];
  for (let index = leadingZeros; index < value.length; index += 1) {
    const digit = BASE58_ALPHABET.indexOf(value[index]);
    if (digit < 0) {
      throw new TypeError("did:key contains an invalid base58btc character");
    }

    let carry = digit;
    for (let position = 0; position < bytes.length; position += 1) {
      carry += bytes[position] * 58;
      bytes[position] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  return Uint8Array.from([...Array.from({ length: leadingZeros }, () => 0), ...bytes.reverse()]);
}

function toBytes(value) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("public key must be an ArrayBuffer or typed array");
}
