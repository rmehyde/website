import {parse as parseYaml} from "yaml";
import {z} from "zod";

const ContentType = z.enum(["project"]);

const LinkSchema = z.object({
        tag: z.string(),
        detail: z.string(),
        target: z.string(),
})

export const ContentSchema = z.object(
    {
        contentType: ContentType,
        title: z.string(),
        priority: z.number(),
        summary: z.string(),
        detail: z.string(),
        links: z.array(LinkSchema).optional(),
    }
)

const ProjectSchema = ContentSchema.extend({
    contentType: z.literal(ContentType.enum.project),
})

export type Content = z.infer<typeof ContentSchema>;

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

// TODO: rather than fetching, bundle the templates to prevent loads
export async function loadTemplate(filePath: string): Promise<string> {
        const response = await fetch(filePath);
        if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        }
        return await response.text()
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
                return `\\uhref{${link.target}}{${escapeLatex(link.detail)}}`;
        }).join("\n") ?? "";

        return `
\\section*{${content.title}}
${escapeLatex(content.detail)}\n
\\noindent
${linksLatex}
    `.trim();
}
