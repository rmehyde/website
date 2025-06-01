
import {encryptedContactData} from "./encrypted";

export async function   decryptContactInfo(
    password: string,
): Promise<{ email: string; phone: string }> {
    const t0 = performance.now();

    // decode b64 into a byte array: [ salt(16) | iv(12) | tag(16) | ciphertext(...) ]
    const raw = Uint8Array.from(atob(encryptedContactData), (c) => c.charCodeAt(0));

    const salt = raw.slice(0, 16);
    const iv = raw.slice(16, 28);
    const tag = raw.slice(28, 44);
    const ciphertext = raw.slice(44);

    // reconstruct ciphertext+tag for AES-GCM decrypt
    const cipherPlusTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    cipherPlusTag.set(ciphertext, 0);
    cipherPlusTag.set(tag, ciphertext.byteLength);

    // import raw password string as a CryptoKey for PBKDF2
    const pwUtf8 = new TextEncoder().encode(password);
    const baseKey = await crypto.subtle.importKey(
        "raw",
        pwUtf8,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // derive 256-bit AES-GCM key using the same salt, iterations, and hash
    const aesKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 500_000,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    // attempt AES-GCM decryption
    let plainBuffer: ArrayBuffer;
    try {
        plainBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            aesKey,
            cipherPlusTag
        );
    } catch {
        throw new Error("Decryption failed");
    }

    // decode bytes and parse json
    const plaintext = new TextDecoder().decode(plainBuffer);
    console.log(`Decryption took ${performance.now() - t0} ms`);
    return JSON.parse(plaintext);
}
