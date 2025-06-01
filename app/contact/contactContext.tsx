"use client";

import { createContext, ReactNode, useState } from "react";

export interface ContactInfo {
    email: string;
    phone: string;
}

const defaultMasked: ContactInfo = {
    email: "********@******.com",
    phone: "(***) ***-****",
};

export const ContactContext = createContext<{
    contact: ContactInfo;
    setContact: (c: ContactInfo) => void;
}>({
    contact: defaultMasked,
    setContact: () => {},
});

export function ContactProvider({ children }: { children: ReactNode }) {
    // start with masked defaults
    const [contact, setContact] = useState<ContactInfo>(defaultMasked);

    return (
        <ContactContext.Provider value={{ contact, setContact }}>
            {children}
        </ContactContext.Provider>
    );
}