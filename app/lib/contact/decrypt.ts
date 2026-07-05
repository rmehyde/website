import {encryptedContactData} from "./encrypted";
import type {ContactInfo} from "./contact-store";

const PBKDF2_ITERATIONS = 500_000;

// Base64-decoded blob layout: [ salt(16) | iv(12) | tag(16) | ciphertext(...) ].
// The salt is fixed at encrypt time (see scripts/encrypt-contact.js), so the key derived
// below is stable across re-encryptions and can be cached client-side.
function parseBlob() {
    const raw = Uint8Array.from(atob(encryptedContactData), (c) => c.charCodeAt(0));

    const salt = raw.slice(0, 16);
    const iv = raw.slice(16, 28);
    const tag = raw.slice(28, 44);
    const ciphertext = raw.slice(44);

    // WebCrypto's AES-GCM expects ciphertext+tag concatenated.
    const cipherPlusTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    cipherPlusTag.set(ciphertext, 0);
    cipherPlusTag.set(tag, ciphertext.byteLength);

    return {salt, iv, cipherPlusTag};
}

// Derive the AES-GCM key from the passphrase — the one expensive (PBKDF2) step. Extractable
// so the caller can export and cache it; because the salt is fixed, this same key decrypts
// every future blob, so the passphrase is only ever needed once (the initial unlock).
export async function deriveKey(password: string): Promise<CryptoKey> {
    const {salt} = parseBlob();

    const baseKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        {name: "PBKDF2"},
        false,
        ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
        {name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256"},
        baseKey,
        {name: "AES-GCM", length: 256},
        true, // extractable: so we can export + cache the key
        ["decrypt"],
    );
}

// Decrypt the contact blob with an already-derived key. Throws on a wrong key (GCM auth-tag
// failure) — callers treat that as "invalid passphrase" or "stale cached key, re-prompt".
export async function decryptWithKey(key: CryptoKey): Promise<ContactInfo> {
    const {iv, cipherPlusTag} = parseBlob();

    const plainBuffer = await crypto.subtle.decrypt(
        {name: "AES-GCM", iv, tagLength: 128},
        key,
        cipherPlusTag,
    );

    return JSON.parse(new TextDecoder().decode(plainBuffer));
}

// Cache helpers: export the derived key to a base64 string for localStorage, and re-import
// it on load. The re-imported key need not be extractable — it's only used to decrypt.
export async function exportKeyB64(key: CryptoKey): Promise<string> {
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    let binary = "";
    for (let i = 0; i < raw.length; i++) binary += String.fromCharCode(raw[i]);
    return btoa(binary);
}

export async function importKeyB64(b64: string): Promise<CryptoKey> {
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey(
        "raw",
        raw,
        {name: "AES-GCM", length: 256},
        false,
        ["decrypt"],
    );
}
