"use client";

import clsx from "clsx";
import {ChevronDown} from "lucide-react";

import {useContactStore} from "@/app/contact/contactContext";
import {ContactInfoDisplay} from "./ContactInfoDisplay";
import {UnlockForm} from "./UnlockForm";
import {ContactIntro, REVEAL_TEXT} from "./content";
import {scale} from "@/app/lib/typography";

// shadcn/ui components:
import {Collapsible, CollapsibleTrigger, CollapsibleContent} from "@/components/ui/collapsible";
import {CopyPageBody, CopyPageContent} from "@/app/ui/copyPage";
import {Separator} from "@/components/ui/separator";
import {cn} from "@/components/lib/utils";
import {H1} from "@/app/ui/sectionHeaders";

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
                        <UnlockForm/>
                    </CollapsibleContent>
                </Collapsible>
            ) : (
                <ContactInfoDisplay className="space-y-4"/>
            )}
        </CopyPageBody>
    );
}
