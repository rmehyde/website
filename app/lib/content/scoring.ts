import {z} from "zod/v4";

export const maxScore = 5

export const Dimension = z.enum(
    [
        "ml-eng",
        "ml-science",
        "data-analytics",
        "leadership",
        "sales-eng",
        "frontend",
        "devops-infra",
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
    "devops-infra": "DevOps & Infra Engineering",
    "backend": "Backend Engineering",
    "data-eng": "Data Engineering",
};

export const dimensionScoresSchema = z.object(
    Dimension.options.reduce((result, dim) => {
        // TODO: revisit!
        // @ts-ignore
        result[dim] = z.number().int().min(0).max(maxScore).default(0)
        return result
    }, {} as Record<Dimension, z.ZodDefault<z.ZodNumber>>)
)
export type DimensionScores = z.infer<typeof dimensionScoresSchema>;

// combine dimension preference scores with a content score
export function scoreContent(weights: DimensionScores, contentScores: DimensionScores) {
    return Object.fromEntries(
        Object.entries(weights).map(
            ([dim, dimScore]) => [ dim, dimScore - (maxScore - contentScores[Dimension.parse(dim)]) ]
        )
    );
}
