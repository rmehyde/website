import React from "react";

import {contentDir} from "@/app/lib/mdx-content";
import MDXCards from "@/app/ui/cards/mdxcards";

export default async function Home() {
    return (
        <div>
            <MDXCards contentDir={contentDir + "/projects"}/>
        </div>
    )
}
