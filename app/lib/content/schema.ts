import {parse as parseYaml} from "yaml";
import {z} from "zod";
import {dimensionScoresSchema} from "@/app/lib/content/scoring";


export const ContentTypeEnum = z.enum(["project", "oss"]);
export type ContentType = z.infer<typeof ContentTypeEnum>;

export const LinkSchema = z.object({
    tag: z.string(),
    detail: z.string(),
    target: z.string(),
})
export type Link = z.infer<typeof LinkSchema>;

export const BaseContentSchema = z.object(
    {
        contentType: ContentTypeEnum,
        title: z.string(),
        summary: z.string(),
        detail: z.string(),
        links: z.array(LinkSchema).optional(),
        priority: z.number(),
        scores: dimensionScoresSchema,
    }
)
export type BaseContent = z.infer<typeof BaseContentSchema>;

export const ProjectSchema = BaseContentSchema.extend({
    contentType: z.literal(ContentTypeEnum.enum.project),
})
export type Project = z.infer<typeof ProjectSchema>;

export const OpenSourceSchema = BaseContentSchema.extend({
    contentType: z.literal(ContentTypeEnum.enum.oss),
})
export type OpenSource = z.infer<typeof ProjectSchema>;

export const ContentSchema = z.discriminatedUnion(
    "contentType", [ProjectSchema, OpenSourceSchema]
)
export type Content = z.infer<typeof ContentSchema>;

export type ContentByType = {
    [T in ContentType]: Extract<Content, { contentType: T }>[]
};
