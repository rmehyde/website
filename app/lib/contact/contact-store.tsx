"use client";

import {create} from 'zustand';
import {deriveKey, decryptWithKey, exportKeyB64, importKeyB64} from './decrypt';

export interface ContactInfo {
    email: string;
    phone: string;
}

// We cache the derived AES key (not the passphrase, not the plaintext). With a fixed salt
// it stays valid across re-encryptions, so a returning visitor's stored key decrypts a
// freshly-deployed blob with no re-prompt. If the key ever fails to decrypt (e.g. the
// passphrase was rotated) we discard it and fall back to the passphrase form, silently.
const STORAGE_KEY = 'contact-key';

const defaultMasked: ContactInfo = {
    email: "********@******.com",
    phone: "(***) ***-****",
};

interface ContactStore {
    contact: ContactInfo;
    locked: boolean;
    // First unlock (passphrase form): derive the key, decrypt to verify, cache the key.
    // Returns false on a wrong passphrase so the caller can show the error.
    unlock: (passphrase: string) => Promise<boolean>;
    // On load: decrypt the current blob with the cached key. An invalid key fails the GCM
    // auth tag — we drop it and stay locked. No-op when there's no cached key.
    hydrate: () => Promise<void>;
}

export const useContactStore = create<ContactStore>()((set) => ({
    contact: defaultMasked,
    locked: true,
    unlock: async (passphrase) => {
        try {
            const key = await deriveKey(passphrase);
            const contact = await decryptWithKey(key);
            localStorage.setItem(STORAGE_KEY, await exportKeyB64(key));
            set({contact, locked: false});
            return true;
        } catch {
            return false;
        }
    },
    hydrate: async () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        try {
            const contact = await decryptWithKey(await importKeyB64(stored));
            set({contact, locked: false});
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
    },
}));

// Query-param keys that override contact info on the résumé. Centralized so the override
// reader and the URL-preserver below stay in sync (and so adding a key is a one-line change).
export const CONTACT_PARAM_KEYS = ['email', 'phone'] as const;

// Optional ?email= / ?phone= query overrides, read by the résumé PDF. They let us export a
// resume with REAL (un-obfuscated) contact info for ATS parsing via a crafted URL, without
// unlocking. Each field overrides independently; absent fields fall through to the store.
// Note: URL-encode values — a literal "+" in a query string decodes to a space (use %2B).
export function contactOverrideFromParams(params: URLSearchParams): Partial<ContactInfo> {
    const override: Partial<ContactInfo> = {};
    for (const key of CONTACT_PARAM_KEYS) {
        const val = params.get(key)?.trim();
        if (val) override[key] = val;
    }
    return override;
}

// Carry contact override params from one query string into another. The résumé rebuilds its
// URL from the graph weights on every change; without this, that rewrite would drop ?email/?phone.
export function preserveContactParams(from: URLSearchParams, into: URLSearchParams): void {
    for (const key of CONTACT_PARAM_KEYS) {
        const val = from.get(key);
        if (val !== null) into.set(key, val);
    }
}

// Hydrate once on the client. The store starts masked/locked (matching SSR), then flips to
// unlocked if a valid cached key is present — so the unlock survives reloads without a prompt.
if (typeof window !== 'undefined') {
    useContactStore.getState().hydrate();
}
