import { type ReactNode } from "react";
import { cn } from "@/components/lib/utils";
import { scale } from "@/app/lib/typography";

type MdH1Props = {
    children: ReactNode;
    className?: string;
    prefix?: ReactNode;
};

export function MdH1({ children, className = "", prefix }: MdH1Props): React.JSX.Element {
    return (
        <h1 className={cn(scale.lead, "font-medium pb-2", className)}>
            {prefix}
            {children}
        </h1>
    );
}

export function MdLink(content: {href: string, children: ReactNode}): React.JSX.Element {
    return (<a href={content.href} target="_blank" className="underline text-royalblue-400 visited:text-cobalt-700">{content.children}</a>)
}
