"use client";

import clsx from "clsx";

import {useContactStore} from "@/app/contact/contactContext";
import {scale} from "@/app/lib/typography";

// Reads the global contact store and renders email/phone, masked or revealed
// depending on unlock state. Used on the Contact page; intentionally NOT shown
// inside the Resume modal, where the PDF itself is the display.
export function ContactInfoDisplay({className}: {className?: string}) {
    const contact = useContactStore((state) => state.contact);

    return (
        <div className={className}>
            <div>
                <div className={clsx(scale.body, "text-muted-foreground")}>Email</div>
                <div className={scale.feature}>{contact.email}</div>
            </div>
            <div>
                <div className={clsx(scale.body, "text-muted-foreground")}>Phone</div>
                <div className={scale.feature}>{contact.phone}</div>
            </div>
        </div>
    );
}
