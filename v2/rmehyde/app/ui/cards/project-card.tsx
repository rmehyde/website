'use client';

import {promises as fs} from 'fs';
import {join} from 'path';
import {evaluate, EvaluateOptions} from "@mdx-js/mdx";
import * as runtime from 'react/jsx-runtime'
import {contentDir} from "@/app/lib/paths";

export function Planet() {
    return <span style={{color: 'tomato'}}>Pluto</span>

}

export default async function ProjectCard({source}): Promise<React.JSX.Element> {
    const filePath = join(contentDir, `${source}`);
    const fileContent = await fs.readFile(filePath, 'utf-8')

    const evaluateOptions: EvaluateOptions = {
        ...runtime
    }
    const MDXContent = (await evaluate(fileContent, evaluateOptions)).default

    return (
        <div className="bg-gray-100 font-sans text-base block box-content p-5 m-4 shadow-md">
            <MDXContent components={{Planet}}/>
        </div>
    )
}


