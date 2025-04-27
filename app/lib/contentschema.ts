import fs from "fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const ContentType = z.enum(["project"]);

const LinkSchema = z.object({
        text: z.string(),
        detail: z.string(),
        target: z.string(),
})

const ContentSchema = z.object(
    {
        contentType: ContentType,
        title: z.string(),
        priority: z.number(),
        summary: z.string(),
        detail: z.string(),
        links: z.array(LinkSchema).optional(),
    }
)

// const ProjectSchema = ContentSchema.extend({
//     contentType: z.literal(ContentType.enum.project),
// })

type Content = z.infer<typeof ContentSchema>;

// TODO: rather than fetching, bundle the YAML to prevent loads
export async function loadContent(filePath: string): Promise<Content> {
        const response = await fetch(filePath);
        if (!response.ok) {
                throw new Error(`Failed to fetch YAML: ${response.status} ${response.statusText}`);
        }
        const rawYaml = await response.text();

        const parsed = parseYaml(rawYaml);
        return ContentSchema.parse(parsed);
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


export function contentToLatex(content: Content): string {
        const linksLatex = content.links?.map(link => {
                return `\\href{${link.target}}{${escapeLatex(link.detail)}}`;
        }).join("\n") ?? "";

        return `
\\section*{${content.title}}
${escapeLatex(content.detail)}

${linksLatex}
    `.trim();
}
