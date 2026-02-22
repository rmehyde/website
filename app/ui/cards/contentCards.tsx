'use client'

import React, { useEffect, useState } from 'react'
import { DimensionScores, } from '@/app/lib/content/scoring'
import {generateContentElements} from "@/app/lib/content/jsx";
import {getFilteredAndSortedContent, groupContentByType} from "@/app/lib/content/load";
import {ContentTypeEnum} from "@/app/lib/content/schema";
import {Card} from "@/components/ui/card";

export default function ContentCards({ weights }: { weights: DimensionScores }) {
    const [cards, setCards] = useState<React.JSX.Element[] | null>(null)

    useEffect(() => {
        let cancelled = false

        function load() {
            const allContent = getFilteredAndSortedContent(weights)
            const content = groupContentByType(allContent)[ContentTypeEnum.enum.project];
            const items = content.map(c => (
                <div key={c.title} className="w-full p-5 lg:w-[32rem]">
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

    return (
        <div className="grid grid-cols-1 justify-items-center lg:grid-cols-[repeat(2,32rem)] lg:justify-center lg:justify-items-stretch xl:gap-20">
            {cards}
        </div>
    )
}
