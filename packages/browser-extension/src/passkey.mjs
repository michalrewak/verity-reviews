import { getAuthorKey, putAuthorKey } from "./key-store.mjs";

const IDENTITY_KEY = "authorIdentity";

export async function getIdentity() {
  const values = await chrome.storage.local.get(IDENTITY_KEY);
  return values[IDENTITY_KEY] ?? null;
}

export async function createPasskeyBackedKey() {
  requirePasskeys();
  const userId = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Verity Reviews" },
      user: {
        id: userId,
        name: `verity-${crypto.randomUUID()}@local`,
        displayName: "Verity reviewer"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -8 }
      ],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required"
      },
      attestation: "none"
    }
  });
  if (!credential) {
    throw new Error("passkey creation was cancelled");
  }

  const signingKeys = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    false,
    ["sign", "verify"]
  );
  const publicKey = await crypto.subtle.exportKey("raw", signingKeys.publicKey);
  const digest = await crypto.subtle.digest("SHA-256", publicKey);
  const keyId = `urn:verity:key:sha256:${toHex(digest)}`;
  const identity = {
    keyId,
    credentialId: toBase64Url(credential.rawId),
    createdAt: new Date().toISOString()
  };
  await putAuthorKey({ keyId, privateKey: signingKeys.privateKey, publicKey: signingKeys.publicKey });
  await chrome.storage.local.set({ [IDENTITY_KEY]: identity });
  return identity;
}

export async function authorizeSigning(identity, challenge) {
  requirePasskeys();
  if (!(challenge instanceof Uint8Array) || challenge.byteLength < 16) {
    throw new TypeError("a signing challenge of at least 16 bytes is required");
  }
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        type: "public-key",
        id: fromBase64Url(identity.credentialId)
      }],
      userVerification: "required"
    }
  });
  if (!assertion) {
    throw new Error("passkey verification was cancelled");
  }
  const key = await getAuthorKey(identity.keyId);
  if (!key?.privateKey) {
    throw new Error("the local author key is unavailable on this device");
  }
  return key.privateKey;
}

function requirePasskeys() {
  if (!globalThis.PublicKeyCredential || !navigator.credentials) {
    throw new Error("this browser does not support passkeys");
  }
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(buffer) {
  let value = "";
  for (const byte of new Uint8Array(buffer)) {
    value += String.fromCharCode(byte);
  }
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
