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
                <Card key={c.title} className="block box-content p-5 m-4">
                    {generateContentElements(c)}
                </Card>
            ))
            console.log(items)
            if (!cancelled) setCards(items)
        }

        load()
        return () => { cancelled = true }
    }, [weights])

    if (!cards) {
        return <p>Loading content…</p>
    }

    return <div>{cards}</div>
}
