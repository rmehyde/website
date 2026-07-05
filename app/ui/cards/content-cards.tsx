'use client'

import React, {useEffect, useState} from 'react'
import {DimensionScores,} from '@/app/lib/content/scoring'
import {getFilteredAndSortedContent, groupContentByType} from "@/app/lib/content/load";
import {loadAllContent} from "@/app/lib/content/content-io";
import {Content, ContentTypeEnum, Link as LinkData} from "@/app/lib/content/schema";
import {MdH1, MdLink} from "@/app/ui/cards/markdown-elements";
import {DynamicIcon} from "lucide-react/dynamic";
import {scale} from "@/app/lib/typography";


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

function generateContentElements(
    {title, icon, detail, links}: Omit<Content, 'content'>
): React.ReactNode {
    return (
        <>
            <MdH1
                className="m-0 pb-0 inline-flex items-center gap-2"
                prefix={
                    icon ? <DynamicIcon name={icon as any}/> : null
                }
            >
                {title}
            </MdH1>
            <div className={scale.feature}>
                <p>{detail.trim()}</p>

                {links && links.length > 0 && (
                    <p className="mt-1.5">
                        {links.map((link: LinkData, i: number) => {
                            const label =
                                i === 0
                                    ? link.detail
                                    : link.detail.charAt(0).toLowerCase() + link.detail.slice(1)

                            return (
                                <React.Fragment key={link.target}>
                                    <MdLink href={link.target}>{label}</MdLink>
                                    {i < links.length - 1 && ' or '}
                                </React.Fragment>
                            )
                        })}
                    </p>
                )}
            </div>
        </>
    )
}
