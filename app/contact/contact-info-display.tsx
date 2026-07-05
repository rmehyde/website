"use client";

import clsx from "clsx";

import {useContactStore} from "@/app/lib/contact/contact-store";
import {scale} from "@/app/lib/typography";

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
