"use client";

import clsx from "clsx";
import {ChevronDown} from "lucide-react";

import {useContactStore} from "@/app/lib/contact/contact-store";
import {ContactInfoDisplay} from "./contact-info-display";
import {ContactUnlockForm} from "../ui/contact-unlock-form";
import {ContactIntro} from "./content";
import {scale} from "@/app/lib/typography";

// shadcn/ui components:
import {Collapsible, CollapsibleTrigger, CollapsibleContent} from "@/components/ui/collapsible";
import {CopyPageBody, CopyPageContent} from "@/components/ui/copy-page";
import {Separator} from "@/components/ui/separator";
import {H1} from "@/components/ui/section-headers";
import {REVEAL_TEXT} from "@/app/lib/contact/contact-constants";

export default function ContactPage() {
    const locked = useContactStore((state) => state.locked);

    return (
        <CopyPageBody>
            <H1>Contact</H1>
            <CopyPageContent>
                <ContactIntro/>
            </CopyPageContent>

            <Separator className={"my-6"}/>

            {locked ? (
                <Collapsible>
                    <CollapsibleTrigger
                        className={clsx(
                            scale.feature,
                            "group inline-flex items-center gap-2 font-medium",
                            "cursor-pointer underline-offset-4 transition hover:underline",
                        )}
                    >
                        {REVEAL_TEXT}
                        <ChevronDown
                            className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180"
                            aria-hidden="true"
                        />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-6">
                        <ContactUnlockForm/>
                    </CollapsibleContent>
                </Collapsible>
            ) : (
                <ContactInfoDisplay className="space-y-4"/>
            )}
        </CopyPageBody>
    );
}
