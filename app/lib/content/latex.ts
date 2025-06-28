import {Content} from "@/app/lib/content/schema";

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

export function contentToLatex(content: Content): string {
    const linksLatex = content.links?.map(link => {
        return `\\uhref{${link.target}}{${escapeLatex(link.detail)}}`;
    }).join("\n") ?? "";

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
