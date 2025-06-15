'use client'

import React, { useEffect, useState } from 'react'
import { ContentSchema } from '@/app/lib/content/contentschema'
import { dimensionScoresSchema, DimensionScores, scoreContent } from '@/app/lib/content/scoring'
import {generateContentElements} from "@/app/lib/content/tojsx";

// load all .yaml/.yml/.md/.mdx as raw text at build time
const contentModules = (require as any).context(
    '@/public/content',
    false,
    /\.(?:ya?ml)$/
)

// TODO: since content won't change we should render elements upfront and then just sort/filter based on weights
export default function ContentCards({ weights }: { weights: DimensionScores }) {
    const [cards, setCards] = useState<React.JSX.Element[] | null>(null)

    useEffect(() => {
        let cancelled = false

        function load() {
            console.log("loading...")
            const items: { priority: number; element: React.JSX.Element }[] = []

            for (const key of contentModules.keys()) {
                const filename = key.replace(/^\.\//, '')
                const raw = contentModules(key) as string

                const parsed = ContentSchema.parse(raw)
                const contentScores = scoreContent(
                    weights,
                    parsed.scores,
                )
                console.log(contentScores);
                const totalScore = Object.values(contentScores).filter(v => v > 0).reduce((a, b) => a + b, 0)
                console.log(parsed.title, totalScore);
                const element = generateContentElements(parsed)
                items.push({
                    priority: -totalScore,
                    element: (
                        <div key={filename} className="bg-gray-100 font-sans text-base block box-content p-5 m-4 shadow-bold">
                            {element}
                        </div>
                    ),
                })
            }

            items.sort((a, b) => a.priority - b.priority)
            console.log(items)
            if (!cancelled) setCards(items.map(i => i.element))
        }

        load()
        return () => { cancelled = true }
    }, [weights])

    if (!cards) {
        return <p>Loading content…</p>
    }

    return <div>{cards}</div>
}
