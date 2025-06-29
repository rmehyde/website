import {BaseContent, Content, ContentByType, ContentTypeEnum, Link, Project} from "@/app/lib/content/schema";
import {z} from "zod";
import dedent from "dedent";

enum Verbosity {
    Concise = "Concise",
    Verbose = "Verbose",
}

export function escapeLatex(str: string): string {
    return str
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\^/g, '\\^{}')
        .replace(/~/g, '\\~{}');
}

function linksToLatex(links: Link[] | undefined, verbosity: Verbosity): string {
    if (links === undefined || links.length === 0) {
        console.log("no links", links)
        return ""
    }
    switch (verbosity) {
        case Verbosity.Concise:
            const hyperlinks = links.map(link =>
                `\\uhref{${escapeLatex(link.target)}}{(${escapeLatex(link.tag)})}`
            ).join(', ')
            return `\\textsuperscript{${hyperlinks}}`
        case Verbosity.Verbose:
            return links.map((link, i) => {
                    const label =
                        i === 0
                            ? link.detail
                            : link.detail.charAt(0).toLowerCase() + link.detail.slice(1)
                    return `\\uhref{${escapeLatex(link.target)}}{${escapeLatex(label)}}`
                }
            ).join(" or ")
    }
}

function baseContentToLatex(
    projects: BaseContent[],
    verbosity: Verbosity,
    includeLinks: boolean = true,
): string {
    switch (verbosity) {
        case Verbosity.Concise:
            return projects.map(project => {
                return `\\textbf{${escapeLatex(project.title)}}: ${escapeLatex(project.summary)}` +
                    (includeLinks ? " " + linksToLatex(project.links, verbosity) : "")
            }).join(`\\bulletspace\n`)
        case Verbosity.Verbose:
            return projects.map(project => {
                return dedent(String.raw`
                    \section*{${escapeLatex(project.title)}}
                    ${escapeLatex(project.detail)}`
                    + (includeLinks ? String.raw`
                    
                    \noindent
                    ${linksToLatex(project.links, verbosity)}`
                        : "")
                );
            }).join("\n");
    }
}

function projectsToLatex(
    projects: Project[],
    verbosity: Verbosity,
    maxProjects: number | null = null,
    includeLinks: boolean = true,
): string {
    let suffix = ""
    if (maxProjects !== null && projects.length > maxProjects) {
        projects = projects.slice(0, maxProjects);
        // TODO: in the future it would be kinda cool if this took you to a projects page with the scores as
        //  the ones used to generate this resume
        suffix = `\\bulletspace\n(\\& more at \\blkuhref{https://rmehyde.com/projects}{rmehyde.com})\n`
    }
    return baseContentToLatex(projects, verbosity, includeLinks) + suffix
}


// TODO: move to another module
export function projectsOssToLatex(content: ContentByType) {
    const projectsContent = projectsToLatex(
        content[ContentTypeEnum.enum.project],
        Verbosity.Concise,
        3,
        false,
    );
    const ossContent = baseContentToLatex(
        content[ContentTypeEnum.enum.oss],
        Verbosity.Concise,
        true
    );
    const maybeSeparator = (projectsContent.length > 0 && ossContent.length > 0)
        // TODO: the second vspace isn't doing anything?
        ? dedent(String.raw`
            \vspace{-.5em}
            \par\noindent
            \makebox[\linewidth][c]{\rule{0.25\linewidth}{0.75pt}}
            \vspace{-1.25em}
            \par\noindent
            `)
        : ""
    console.log(projectsContent, ossContent)
    return projectsContent + maybeSeparator + ossContent;
}


// TODO: rather than fetching, bundle the templates to prevent loads
export async function loadTemplate(filePath: string): Promise<string> {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
    }
    return await response.text()
}
