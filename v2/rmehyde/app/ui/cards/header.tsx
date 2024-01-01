import {join} from "path";
import {contentDir} from "@/app/lib/paths";
import {promises as fs} from "fs";
import {evaluate} from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";


export default function CardH1({content}): React.JSX.Element {
    console.log("creating card h1")
    return <>
        <h1 className={'text-red-600'}>{content}</h1>
    </>
}
