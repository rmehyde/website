// 'use client';

import {promises as fs} from 'fs';
import {join} from 'path';
import {evaluate, EvaluateOptions} from "@mdx-js/mdx";
import * as runtime from 'react/jsx-runtime'
import {H1, Link} from "@/app/ui/cards/markdown-elements";
import React from "react";

const Suffixes = [".mdx", ".md"]

// TODO: ordering

export async function MDXCard({fileContent}): Promise<{ component: React.JSX.Element }> {
    const evaluateOptions: EvaluateOptions = {
        ...runtime
    }
    const MDXContent = (await evaluate(fileContent, evaluateOptions)).default

    return (
        <div className="bg-gray-100 font-sans text-base block box-content p-5 m-4 shadow-bold">
            <MDXContent components={{h1: H1, a: Link}}/>
        </div>
    )
}

export default async function MDXCards({contentDir}): Promise<{ component: React.JSX.Element }> {
    // get all filesnames in contentDir that end with a valid suffix
    const contentFilenames: string[] = (await fs.readdir(contentDir))
        .filter(fname => Suffixes.some(suffix => fname.endsWith(suffix)))

    console.log(contentFilenames)

    // read all files
    const content: Map<string, string> = new Map();
    await Promise.all(
        contentFilenames.map(async (filename) => {
            try {
                content.set(filename, await fs.readFile(join(contentDir, `${filename}`), 'utf-8'));
            } catch (error) {
                console.error(`Error reading file ${filename}: ${error.message}`);
            }
        })
    );

    // construct cards
    const cards = Array.from(content.entries(), ([fname, content]) =>
                    <MDXCard key={fname.substring(0, fname.indexOf("."))} fileContent={content}/>
                )

    // console.log(cards)

    // build cards into final component according to priority
    return (
        <div>
            {cards}
        </div>
    )
}


