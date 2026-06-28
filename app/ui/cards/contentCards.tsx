'use client'

import React, { useEffect, useState } from 'react'
import { DimensionScores, } from '@/app/lib/content/scoring'
import {generateContentElements} from "@/app/lib/content/jsx";
import {getFilteredAndSortedContent, groupContentByType} from "@/app/lib/content/load";
import {loadAllContent} from "@/app/lib/content/content-io";
import {ContentTypeEnum} from "@/app/lib/content/schema";
import {Card} from "@/components/ui/card";

export default function ContentCards({ weights }: { weights: DimensionScores }) {
    const [cards, setCards] = useState<React.JSX.Element[] | null>(null)

    useEffect(() => {
        let cancelled = false

        function load() {
            const allContent = getFilteredAndSortedContent(loadAllContent(), weights)
            const content = groupContentByType(allContent)[ContentTypeEnum.enum.project];
            const items = content.map(c => (
                <div key={c.title}>
                    {generateContentElements(c)}
                </div>
            ))
            console.log(items)
            if (!cancelled) setCards(items)
        }

        load()
        return () => { cancelled = true }
    }, [weights])

    if (!cards) {
        // TODO: center and so on, make it look better
        return <p>Loading content…</p>
    }

    // Fill the available width: 1 column on mobile, 2 flexible (1fr) columns at lg+ that stretch
    // to the page margins.
    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {cards}
        </div>
    )
}
