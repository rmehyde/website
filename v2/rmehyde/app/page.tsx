import React from "react";
import ProjectCard from "@/app/ui/cards/project-card";

import {promises as fs} from 'fs';

import Example from '../content/example.mdx'
import {contentDir} from "@/app/lib/paths";

export default async function Home() {
    const projectNames: string[] = await fs.readdir(contentDir)
    console.log("names: ", projectNames)

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div>
                {projectNames.map((project) => (
                    <ProjectCard key={project} source={project}/>
                ))}
            </div>
            <Example/>
        </main>
    )
}
