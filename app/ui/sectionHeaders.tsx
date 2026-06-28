import {cn} from "@/components/lib/utils";
import {scale} from "@/app/lib/typography";
import type {ReactNode} from "react";

export function H1({ children, className = "" }: { children: ReactNode, className?: string}): React.JSX.Element {
    return (
        <h1 className={cn(scale.headline, "font-medium", className)}>
            {children}
        </h1>
    );
}

export function H2({ children, className = "" }: { children: ReactNode, className?: string}): React.JSX.Element {
    return (
        <h2 className={cn(scale.lead, "font-medium", className)}>
            {children}
        </h2>
    );
}