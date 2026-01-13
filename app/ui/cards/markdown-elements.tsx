import { type ReactNode } from "react";

type H1Props = {
    children: ReactNode;
    className?: string;
    prefix?: ReactNode;
};

export function H1({ children, className = "", prefix }: H1Props): React.JSX.Element {
    return (
        <h1 className={`text-2xl font-medium pb-2 ${className}`.trim()}>
            {prefix}
            {children}
        </h1>
    );
}

export function Link(content: {href: string, children: ReactNode}): React.JSX.Element {
    return (<a href={content.href} target="_blank" className="underline text-royalblue-400 visited:text-cobalt-700">{content.children}</a>)
}
