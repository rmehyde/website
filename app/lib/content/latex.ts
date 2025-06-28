import {Content, Link} from "@/app/lib/content/schema";
import {z} from "zod";

enum Verbosity {
    Concise = "Concise",
    Standard = "Standard",
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
                `\\uhref{${link.target}}{(${escapeLatex(link.tag)})}`
            ).join(', ')
            return `\\textsuperscript{${hyperlinks}}`
        case Verbosity.Standard:
        case Verbosity.Verbose:
            return links.map((link, i) => {
                const label =
                    i === 0
                        ? link.detail
                        : link.detail.charAt(0).toLowerCase() + link.detail.slice(1)
                return `\\uhref{${link.target}}{${escapeLatex(label)}}`
            }
            ).join(" or ")
    }
}

export function contentToLatex(content: Content): string {
    const linksLatex = linksToLatex(content.links, Verbosity.Concise)
    console.log(linksLatex)
    return `
\\section*{${content.title}}
${escapeLatex(content.detail)}\n
\\noindent
${linksLatex}
    `.trim();
}

// TODO: rather than fetching, bundle the templates to prevent loads
export async function loadTemplate(filePath: string): Promise<string> {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
    }
    return await response.text()
}
