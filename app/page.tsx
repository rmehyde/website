import React from "react";
import Link from "next/link";

import {pages} from "@/app/lib/nav";
import {scale} from "@/app/lib/typography";


/**
 * TODO: layout
 *
 * - I want some extra padding when the page is wide / big screen
 * - Everything needs to shrink a bit on mobile
 *
 */



export default async function Home() {
    return (
        <div className="min-h-screen flex flex-col justify-center sm:pl-8">
            <div className="max-w-xl">
                <div className={scale.splash}>
                    {"Hi, I'm Reese."}
                </div>
                <br/>
                <div className={`${scale.lead} text-justify`}>
                    I enjoy building things. This website talks a bit about some software that I’ve built, and other things that I’ve done working for software companies.
                </div>
            </div>
            <div className="m-6"/>
            <div className={`${scale.headline} underline`}>
                {pages.map((label) => (
                    <div key={label}>
                        <Link href={`/${label.toLowerCase()}`}>{`${label}`}</Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
