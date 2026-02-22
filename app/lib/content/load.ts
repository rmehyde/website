import {DimensionScores, scoreContentAbsolute, scoreContentComposite, applyGlobalBudgetLimit} from "@/app/lib/content/scoring";
import {ContentSchema, Content, ContentByType, ContentTypeEnum, Job, Duty} from "@/app/lib/content/schema";

// load all .yaml/.yml content files as objects at build time
const contentModules = (require as any).context(
    '@/public/content',
    true,
    /\.\/.+\/.+\.(?:ya?ml)$/
)

function filterAndSortedContent(
    content: Content[],
    weights: DimensionScores,
    thresholdOverrides: Record<string, number> = {}
): Content[] {
    type ScoredContent = {
        content: Content
        absoluteScores: DimensionScores
        compositeScores: { cosine: number; dotProduct: number }
    }

    const scoredArray: ScoredContent[] = content.map(
        (item: Content): ScoredContent => {
            let updatedContent: Content = item

            // if it's a Job, recurse into duties
            if (item.contentType === ContentTypeEnum.enum.job) {
                const job = item as Job
                const sortedDuties = filterAndSortedContent(
                    job.duties as Content[],
                    weights,
                    thresholdOverrides
                ) as Duty[]
                updatedContent = { ...job, duties: sortedDuties }
            }
            // if it's a Duty, recurse into subduties
            else if (item.contentType === ContentTypeEnum.enum.duty) {
                const duty = item as Duty
                const sortedSubduties = filterAndSortedContent(
                    (duty.subduties ?? []) as unknown as Content[],
                    weights,
                    thresholdOverrides
                ) as Duty[]
                updatedContent = {
                    ...duty,
                    ...(sortedSubduties.length > 0
                        ? { subduties: sortedSubduties }
                        : { subduties: [] }),
                }
            }

            const contentScores = scoreContentAbsolute(
                weights,
                updatedContent.scores,
            )
            const compositeScores = scoreContentComposite(
                weights,
                updatedContent.scores,
            )

            return {
                content: updatedContent,
                absoluteScores: contentScores,
                compositeScores,
            }
        })

    return scoredArray
        // filter using threshold (default 0, with per-content-type overrides)
        .filter((item: ScoredContent) => {
            const threshold = thresholdOverrides[item.content.contentType] ?? 0;
            return Object.values(item.absoluteScores).some(v => v > threshold);
        })
        // sort by composite scores (cosine desc, dotProduct desc)
        .toSorted(
            (a: ScoredContent, b: ScoredContent) => {
                if (Math.abs(a.compositeScores.cosine - b.compositeScores.cosine) > 1e-10) {
                    return b.compositeScores.cosine - a.compositeScores.cosine;
                }
                return b.compositeScores.dotProduct - a.compositeScores.dotProduct;
            }
        )
        // drop scores and return just content
        .map((item: ScoredContent) => item.content)
}

export function getFilteredAndSortedContent(
    weights: DimensionScores,
    budget?: number,
    thresholdOverrides: Record<string, number> = {}
): Content[] {
    const content = contentModules
        .keys()
        .flatMap((key: string): Content[] => {
            const raw: string = contentModules(key) as string
            
            // Handle both single objects and arrays of objects
            if (Array.isArray(raw)) {
                return raw.map(item => ContentSchema.parse(item))
            } else {
                return [ContentSchema.parse(raw)]
            }
        })

    const filteredAndSorted = filterAndSortedContent(content, weights, thresholdOverrides)
    
    if (budget !== undefined) {
        return applyGlobalBudgetLimit(filteredAndSorted, weights, budget)
    }
    
    return filteredAndSorted
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

export function sortJobsByDate(jobs: Job[]) {
    return jobs.toSorted(
        (a, b) =>
            new Date(b.start).getTime() - new Date(a.start).getTime())
}