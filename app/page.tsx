import React from "react";
import Link from "next/link";

import {pages} from "@/app/lib/nav";


/**
 * TODO: layout
 *
 * - I want some extra padding when the page is wide / big screen
 * - Everything needs to shrink a bit on mobile
 *
 */



export default async function Home() {
    return (
        <div className="min-h-screen flex flex-col justify-center md:pl-8">
            <div className="max-w-xl">
                <div className="text-8xl">
                    {"Hi, I'm Reese."}
                </div>
                <br/>
                <div className="text-2xl text-justify">
                    I enjoy building things. This website talks a bit about some software that I’ve built, and other things that I’ve done working for software companies.
                </div>
            </div>
            <div className="m-6"/>
            <div className="text-3xl underline">
                {pages.map((label) => (
                    <div key={label}>
                        <Link href={`/${label.toLowerCase()}`}>{`${label}`}</Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
