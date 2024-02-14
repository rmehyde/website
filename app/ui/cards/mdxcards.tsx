import {promises as fs} from 'fs';
import {join} from 'path';

import {evaluate, EvaluateOptions} from "@mdx-js/mdx";
import * as runtime from 'react/jsx-runtime'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkFrontmatter from 'remark-frontmatter'

import React from "react";
import {H1, Link} from "@/app/ui/cards/markdown-elements";


const Suffixes = [".mdx", ".md"]


export async function MDXCard(key: string, fileContent: string): Promise<{priority: number, component: React.JSX.Element}> {
    // mdx compile options
    // @ts-ignore
    const evaluateOptions: EvaluateOptions = {
        ...runtime,
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter]
    }

    const mdxContent = (await evaluate(fileContent, evaluateOptions))

    return {
        // @ts-ignore
        priority: mdxContent.frontmatter.priority,
            component: (
        <div key={key} className="bg-gray-100 font-sans text-base block box-content p-5 m-4 shadow-bold">
            <mdxContent.default components={
                // @ts-ignore
                {h1: H1, a: Link}
            }/>
        </div>
    )}
}

export default async function MDXCards({contentDir}: {contentDir: string}): Promise<React.JSX.Element> {
    // get all filesnames in contentDir that end with a valid suffix
    const contentFilenames: string[] = (await fs.readdir(contentDir))
        .filter(fname => Suffixes.some(suffix => fname.endsWith(suffix)))

    // parse all files
    const componentsWithPriority: {priority: number, component: React.JSX.Element}[] = [];
    await Promise.all(
        contentFilenames.map(async (filename) => {
            // read file
            const key= filename.substring(0, filename.indexOf("."))
            const fileContent = await fs.readFile(join(contentDir, `${filename}`), 'utf-8');

            // add object with priority and the parsed card
            componentsWithPriority.push(
                await MDXCard(key, fileContent)
            )
        })
    );

    // build cards into final component according to priority
    const cards = componentsWithPriority
        .toSorted((a, b) => {
            if (a.priority === undefined) {
                return 1
            } else if (b.priority === undefined) {
                return -1
            } else {
                return a.priority - b.priority
            }
        })
        .map(card => card.component)

    return (
        <div>
            {cards}
        </div>
    )
}


