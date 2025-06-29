import {DimensionScores, scoreContent} from "@/app/lib/content/scoring";
import {ContentSchema, Content, ContentByType, ContentTypeEnum} from "@/app/lib/content/schema";

// load all .yaml/.yml content files as objects at build time
const contentModules = (require as any).context(
    '@/public/content',
    true,
    /\.(?:ya?ml)$/
)

export function filterAndSortContent(
    weights: DimensionScores
): Content[] {
    type ScoredContent = {
        content: Content
        score: number
    }

    const scoredArray: ScoredContent[] = contentModules
        .keys()
        .map((key: string): ScoredContent => {
            const raw: string = contentModules(key) as string
            console.log(raw)
            const parsed: Content = ContentSchema.parse(raw)
            const contentScores: Record<string, number> = scoreContent(
                weights,
                parsed.scores
            )
            const totalScore: number = Object.values(contentScores)
                .filter((v: number) => v > 0)
                .reduce((sum: number, v: number) => sum + v, 0)

            return { content: parsed, score: totalScore }
        })

    return scoredArray
        .filter((item: ScoredContent) => item.score > 0)
        .sort((a: ScoredContent, b: ScoredContent) => b.score - a.score)
        .map((item: ScoredContent) => item.content)
}

export function groupContentByType(content: Content[]): ContentByType {
    // initiate empty array with each type
    const result = Object.values(ContentTypeEnum.enum).reduce(
        (acc, type) => {
            acc[type] = [];
            return acc;
        },
        {} as ContentByType
    );

    // fill in content for the correct type
    for (const item of content) {
        (result[item.contentType] as Array<typeof item>).push(item);
    }

    return result;
}
