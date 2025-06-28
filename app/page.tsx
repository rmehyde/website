import React from "react";

import {contentDir} from "@/app/lib/mdx-content";
import MDXCards from "@/app/ui/cards/mdxcards";
import GeneratePDFButton from "@/app/ui/pdf";

export default async function Home() {
    return (
        <main className="min-h-screen p-4 md:p-14">
            <GeneratePDFButton />
            <MDXCards contentDir={contentDir + "/projects"}/>
        </main>
    )
}
