import {parse as parseYaml} from "yaml";
import {z} from "zod";
import {dimensionScoresSchema} from "@/app/lib/content/scoring";


const ContentType = z.enum(["project"]);

export const LinkSchema = z.object({
    tag: z.string(),
    detail: z.string(),
    target: z.string(),
})
export type Link = z.infer<typeof LinkSchema>;

const BaseContentSchema = z.object(
    {
        contentType: ContentType,
        title: z.string(),
        summary: z.string(),
        detail: z.string(),
        links: z.array(LinkSchema).optional(),
        priority: z.number(),
        scores: dimensionScoresSchema,
    }
)

export const ProjectSchema = BaseContentSchema.extend({
    contentType: z.literal(ContentType.enum.project),
})
export type Project = z.infer<typeof ProjectSchema>;

export const ContentSchema = z.discriminatedUnion(
    "contentType", [ProjectSchema]
)
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


