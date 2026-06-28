"use client";

import {useContactStore} from "@/app/contact/contactContext";
import {ContactInfoDisplay} from "./ContactInfoDisplay";
import {UnlockForm} from "./UnlockForm";

// shadcn/ui components:
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";

// Inline presentation of the unlock unit: contact info, then (while locked) the
// passphrase form right below it — no Dialog. The Resume page renders the same
// UnlockForm inside a modal instead. Layout here is placeholder; appearance changes
// to follow.
export default function ContactPage() {
    const contact = useContactStore((state) => state.contact);
    const locked = contact.email.includes("*");

    return (
        <div className="flex justify-center p-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Contact Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ContactInfoDisplay className="space-y-2"/>
                    {locked && <UnlockForm/>}
                </CardContent>
            </Card>
        </div>
    );
}
