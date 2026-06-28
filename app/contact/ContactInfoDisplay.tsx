"use client";

import {useContactStore} from "@/app/contact/contactContext";

// Reads the global contact store and renders email/phone, masked or revealed
// depending on unlock state. Used on the Contact page; intentionally NOT shown
// inside the Resume modal, where the PDF itself is the display.
export function ContactInfoDisplay({className}: {className?: string}) {
    const contact = useContactStore((state) => state.contact);

    return (
        <div className={className}>
            <div>
                <span className="font-medium">Email:</span> {contact.email}
            </div>
            <div>
                <span className="font-medium">Phone:</span> {contact.phone}
            </div>
        </div>
    );
}
