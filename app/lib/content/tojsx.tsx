import React from 'react'
import {Content} from './contentschema'
import {H1, Link} from "@/app/ui/cards/markdown-elements"; // wherever your Content type lives

export function generateContentElements(
    {title, detail, links}: Omit<Content, 'content'>
): React.ReactNode {
    return (
        <>
            <H1>{title}</H1>
            <p>{detail.trim()}</p>

            {links && links.length > 0 && (
                <p>
                    {links.map((link, i) => {
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
        </>
    )
}
