'use client'

import React, { useEffect, useState } from 'react'
import { DimensionScores, } from '@/app/lib/content/scoring'
import {generateContentElements} from "@/app/lib/content/jsx";
import {getFilteredAndSortedContent} from "@/app/lib/content/load";

export default function ContentCards({ weights }: { weights: DimensionScores }) {
    const [cards, setCards] = useState<React.JSX.Element[] | null>(null)

    useEffect(() => {
        let cancelled = false

        function load() {
            const content = getFilteredAndSortedContent(weights)
            const items = content.map(c => (
                <div key={c.title} className="bg-gray-100 font-sans text-base block box-content p-5 m-4 shadow-bold">
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
        return <p>Loading content…</p>
    }

    return <div>{cards}</div>
}
