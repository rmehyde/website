import React from "react";
import {cn} from "@/components/lib/utils";
import {scale} from "@/app/lib/typography";

export function CopyPageBody({children, className}: {children: React.ReactNode; className?: string}) {
    return (
        <div className={cn("flex flex-col items-center gap-8", className)}>
            {React.Children.map(children, (child) => (
                <div className="w-full max-w-2xl">{child}</div>
            ))}
        </div>
    );
}

export function CopyPageContent({children, className}: {children: React.ReactNode; className?: string}) {
    return (
        <div className={cn(scale.feature, "space-y-4", className)}>
            {children}
        </div>
    );
}

export function ExternalLink({href, text}: {href: string, text: string}) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{text}</a>
    )
}