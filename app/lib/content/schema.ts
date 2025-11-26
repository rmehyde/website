import {parse as parseYaml} from "yaml";
import {z, ZodArray, ZodTypeAny} from "zod/v4";
import {dimensionScoresSchema} from "@/app/lib/content/scoring";


export const ContentTypeEnum = z.enum(
    [
        "project",
        "oss",
        "job",
        "duty",
    ]
);
export type ContentType = z.infer<typeof ContentTypeEnum>;

export const LinkSchema = z.object({
    tag: z.string(),
    detail: z.string(),
    target: z.string(),
});
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
);
export type BaseContent = z.infer<typeof BaseContentSchema>;

export const ProjectSchema = BaseContentSchema.extend({
    contentType: z.literal(ContentTypeEnum.enum.project),
});
export type Project = z.infer<typeof ProjectSchema>;

export const OpenSourceSchema = BaseContentSchema.extend({
    contentType: z.literal(ContentTypeEnum.enum.oss),
});
export type OpenSource = z.infer<typeof ProjectSchema>;

export const DutySchema = BaseContentSchema.extend({
    contentType: z.literal(ContentTypeEnum.enum.duty),
    // TODO: add a projects matcher/exclusion
    //   I think this means excluding things from being listed in both Projects and Duties? wrote it awhile ago
    get subduties(): ZodArray<ZodTypeAny>{
        return z.array(DutySchema).default([])
    }
});
export type Duty = z.infer<typeof DutySchema>;

export const JobSchema = BaseContentSchema.extend({
    contentType: z.literal(ContentTypeEnum.enum.job),
    company: z.string(),
    roles: z.array(z.string()),
    location: z.string(),
    start: z.iso.date(),
    end: z.iso.date().optional(),
    duties: z.array(DutySchema),
});
export type Job = z.infer<typeof JobSchema>;

export const ContentSchema = z.discriminatedUnion(
    "contentType", [ProjectSchema, OpenSourceSchema, JobSchema]
);
export type Content = z.infer<typeof ContentSchema>;

export type ContentByType = {
    [T in ContentType]: Extract<Content, { contentType: T }>[]
};
