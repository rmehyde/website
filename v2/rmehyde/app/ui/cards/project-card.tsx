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
        // baseUrl: "file://" + join(process.cwd(), 'rmehyde'),
        ...runtime
    }

    const MDXContent = (await evaluate(fileContent, evaluateOptions)).default

    // TODO: this is broken! the components aren't actually passed into the file, Planet shows up
    //  as undefined :(
    return (
        <MDXContent components={{Planet}}/>
    )

}
