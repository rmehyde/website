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

// Bidirectional mapping between dimension keys and short abbreviations
const createDimensionShortKeys = () => {
    const dimToShort: Record<Dimension, string> = {} as Record<Dimension, string>;
    const shortToDim: Record<string, Dimension> = {};
    
    Dimension.options.forEach(dim => {
        const shortKey = (dimensionLabels[dim].match(/[A-Z]/g) || []).join("").toLowerCase();
        dimToShort[dim] = shortKey;
        shortToDim[shortKey] = dim;
    });
    
    return { dimToShort, shortToDim };
};

const { dimToShort, shortToDim } = createDimensionShortKeys();

// URL query parameter utilities for dimension scores
export function dimensionScoresToParams(scores: DimensionScores): URLSearchParams {
    const params = new URLSearchParams();
    Object.entries(scores).forEach(([dim, score]) => {
        if (score > 0) { // Only include non-zero scores to keep URLs cleaner
            const shortKey = dimToShort[dim as Dimension];
            params.set(shortKey, score.toString());
        }
    });
    return params;
}

export function dimensionScoresFromParams(params: URLSearchParams): Partial<DimensionScores> {
    const scores: Partial<DimensionScores> = {};
    
    // Parse each short key from query params
    Object.entries(shortToDim).forEach(([shortKey, dim]) => {
        const value = params.get(shortKey);
        if (value !== null) {
            const score = parseInt(value, 10);
            if (!isNaN(score) && score >= 0 && score <= maxScore) {
                scores[dim] = score;
            }
        }
    });
    
    return scores;
}

// Backwards compatibility - refactored to use the new param system
export function dimensionScoresString(scores: DimensionScores): string {
    return Object.entries(scores).map(([dim, score]) => {
        const shortKey = dimToShort[dim as Dimension];
        return `${shortKey}${score}`;
    }).join("");
}

// combine dimension preference scores with a content score
//   this returns dimensioned scores each in the range [-maxScore, maxScore]
//   it just adds the weight and content score together and subtracts maxScore
//   so 2 and 3 with max of 5 gives 0, 5 and 5 gives 5, 0 and 1 gives -4, etc.
//   helpful for filtering: is this content _relevant in some way_?
export function scoreContentAbsolute(weights: DimensionScores, contentScores: DimensionScores): DimensionScores {
    return Object.fromEntries(
        (Object.keys(weights) as Dimension[]).map(dim => {
            const dimScore = weights[dim];
            const contentScore = contentScores[dim];
            return [dim, dimScore + contentScore - maxScore];
        })
    ) as DimensionScores;
}

// compute cosine similarity between content
//   this considers the similarity of the _direction_
//   helpful for ranking: _how relevant_ is this content?
export function scoreContentCosine(
    weights: DimensionScores,
    contentScores: DimensionScores
): number {
    const dims = Object.keys(weights) as (keyof DimensionScores)[];

    let dot = 0;
    let normW = 0;
    let normC = 0;

    for (const dim of dims) {
        const w = weights[dim] ?? 0;
        const c = contentScores[dim] ?? 0;

        dot += w * c;
        normW += w * w;
        normC += c * c;
    }

    const denom = Math.sqrt(normW) * Math.sqrt(normC);
    if (denom === 0) {
        // define similarity as 0 when one vector is all zeros
        return 0;
    }

    return dot / denom;
}
