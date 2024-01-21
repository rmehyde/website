import React from "react";
import {ReactNode} from "react";

interface Props {
    children: ReactNode
}

export function H1({ children }: {children: ReactNode}): React.JSX.Element {
    return (
        <h1 className={'text-xl pb-2'}>{children}</h1>
    )
}

export function Link(content: {href: string, children: ReactNode}): React.JSX.Element {
    return (<a href={content.href} className="underline text-royalblue-400 visited:text-cobalt-700">{content.children}</a>)
}
