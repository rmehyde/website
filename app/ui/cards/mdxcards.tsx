import { promises as fs } from 'fs';
import { join } from 'path';

import { evaluate, EvaluateOptions } from "@mdx-js/mdx";
import * as runtime from 'react/jsx-runtime'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkFrontmatter from 'remark-frontmatter'
import yaml from 'yaml';

import React from "react";
import { H1, Link } from "@/app/ui/cards/markdown-elements";
import { MDXModule } from 'mdx/types';
import {ContentSchema} from "@/app/lib/contentschema";
import {generateMarkdownFromContent} from "@/app/lib/yamltomdx";

const Suffixes = [".mdx", ".md", ".yaml", ".yml"];

type ParsedContent = {
    priority: number;
    mdxModule: MDXModule;
};

async function parseContentFile(filePath: string, filename: string): Promise<ParsedContent> {
    const evaluateOptions: EvaluateOptions = {
        ...runtime,
        Fragment: React.Fragment,
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
    };

    const fileContent = await fs.readFile(filePath, 'utf-8');
    // TODO: rip out all the now-irrelevant MDX stuff and build components directly from ContentSchema

    // for YAML files
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        const raw = yaml.parse(fileContent);
        const parsed = ContentSchema.parse(raw); // validate with zod
        const mdxString = generateMarkdownFromContent(parsed);
        const mdxContent = await evaluate(mdxString, evaluateOptions);
        return {
            priority: parsed.priority ?? 1000,
            mdxModule: mdxContent,
        };
    }

    // For MDX/MD files
    const mdxContent = await evaluate(fileContent, evaluateOptions);
    return {
        // @ts-ignore
        priority: mdxContent.frontmatter?.priority ?? 1000,
        mdxModule: mdxContent,
    };
}

async function renderMDXCard(
    key: string,
    parsed: ParsedContent
): Promise<{ priority: number; component: React.JSX.Element }> {
    const priority = parsed.priority;
    const mdxContent = parsed.mdxModule
    return {
        priority,
        component: (
            <div key={key} className="bg-gray-100 font-sans text-base block box-content p-5 m-4 shadow-bold">
                {/* @ts-ignore */}
                <mdxContent.default components={{ h1: H1, a: Link }} />
            </div>
        ),
    };
}

export default async function MDXCards({ contentDir }: { contentDir: string }): Promise<React.JSX.Element> {
    const contentFilenames = (await fs.readdir(contentDir))
        .filter(fname => Suffixes.some(suffix => fname.endsWith(suffix)));

    const componentsWithPriority: { priority: number; component: React.JSX.Element }[] = [];

    await Promise.all(
        contentFilenames.map(async (filename) => {
            const key = filename.substring(0, filename.lastIndexOf('.'));
            const filePath = join(contentDir, filename);

            const parsed = await parseContentFile(filePath, filename);
            const rendered = await renderMDXCard(key, parsed);

            componentsWithPriority.push(rendered);
        })
    );

    const cards = componentsWithPriority
        .toSorted((a, b) => a.priority - b.priority)
        .map(card => card.component);

    return (
        <div>
            {cards}
        </div>
    );
}
