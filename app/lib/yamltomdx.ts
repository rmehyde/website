import {Content} from "@/app/lib/contentschema";


export function generateMarkdownFromContent(data: Omit<Content, 'content'>): string {
    const { title, detail, links } = data;

    const lines = [`# ${title}`, detail.trim()];
    if (links && links.length > 0) {
        const linkLine = links
            .map((link, i) => {
                const label = i === 0
                    ? link.detail
                    : link.detail.charAt(0).toLowerCase() + link.detail.slice(1);
                return `[${label}](${link.target})`;
            })
            .join(' or ');
        lines.push('', linkLine);
    }
    return lines.join('\n\n');
}
