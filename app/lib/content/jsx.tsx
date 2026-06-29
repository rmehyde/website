import React from 'react'
import { DynamicIcon } from "lucide-react/dynamic";
import {Content, Link as LinkData} from './schema'
import {H1, Link} from "@/app/ui/cards/markdown-elements";
import {scale} from "@/app/lib/typography";


export function generateContentElements(
    {title, icon, detail, links}: Omit<Content, 'content'>
): React.ReactNode {
    return (
        <>
            <H1
                className="m-0 pb-0 inline-flex items-center gap-2"
                prefix={
                    icon ? <DynamicIcon name={icon as any}/> : null
                }
            >
                {title}
            </H1>
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
                                    <Link href={link.target}>{label}</Link>
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
