"use client";

import { create } from 'zustand';

export interface ContactInfo {
    email: string;
    phone: string;
}

// TODO: add versioning so I can update it

const defaultMasked: ContactInfo = {
    email: "********@******.com",
    phone: "(***) ***-****",
};

const getStoredContact = (): ContactInfo => {
    if (typeof window === 'undefined') return defaultMasked;
    try {
        const stored = localStorage.getItem('contact-info');
        return stored ? JSON.parse(stored) : defaultMasked;
    } catch {
        return defaultMasked;
    }
};

interface ContactStore {
    contact: ContactInfo;
    setContact: (contact: ContactInfo) => void;
}

export const useContactStore = create<ContactStore>()((set) => ({
    contact: getStoredContact(),
    setContact: (contact) => {
        set({ contact });
        if (typeof window !== 'undefined') {
            localStorage.setItem('contact-info', JSON.stringify(contact));
        }
    },
}));