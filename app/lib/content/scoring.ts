import {z} from "zod";


export const Dimension = z.enum(
    [
        "ml-eng",
        "ml-science",
        "data-analytics",
        "leadership",
        "sales-eng",
        "frontend",
        "devops",
        "backend",
        "data-eng",
    ]
)
export type Dimension = z.infer<typeof Dimension>;

export const dimensionLabels: Readonly<Record<Dimension, string>> = {
    "ml-eng": "Machine Learning Engineering",
    "ml-science": "Machine Learning Science",
    "data-analytics": "Data Analytics & Visualization",
    "leadership": "Leadership",
    "sales-eng": "Sales Engineering",
    "frontend": "Frontend Engineering",
    "devops": "DevOps",
    "backend": "Backend Engineering",
    "data-eng": "Data Engineering",
};

export const dimensionScoresSchema = z.object(
    Dimension.options.reduce((result, dim) => {
        result[dim] = z.number().int().min(0).max(5).default(0)
        return result
    }, {} as Record<Dimension, z.ZodNumber>)
)
export type DimensionsScores = z.infer<typeof dimensionScoresSchema>;

