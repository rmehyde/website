import {DimensionScores, scoreContentAbsolute, scoreContentCosine} from "@/app/lib/content/scoring";
import {ContentSchema, Content, ContentByType, ContentTypeEnum, Job, Duty} from "@/app/lib/content/schema";

// load all .yaml/.yml content files as objects at build time
const contentModules = (require as any).context(
    '@/public/content',
    true,
    /\.(?:ya?ml)$/
)

function filterAndSortedContent(
    content: Content[],
    weights: DimensionScores,
): Content[] {
    type ScoredContent = {
        content: Content
        absoluteScores: DimensionScores
        directionScore: number
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
                ) as Duty[]
                updatedContent = { ...job, duties: sortedDuties }
            }
            // if it's a Duty, recurse into subduties
            else if (item.contentType === ContentTypeEnum.enum.duty) {
                const duty = item as Duty
                const sortedSubduties = filterAndSortedContent(
                    (duty.subduties ?? []) as unknown as Content[],
                    weights,
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
            const cosineScore = scoreContentCosine(
                weights,
                updatedContent.scores,
            )

            return {
                content: updatedContent,
                absoluteScores: contentScores,
                directionScore: cosineScore,
            }
        })

    return scoredArray
        // filter to "has any dimension greater than zero"
        .filter((item: ScoredContent) =>
            Object.values(item.absoluteScores).some(v => v > 0),
        )
        // sort by direction similarity (inverting since it sorts ascending)
        .toSorted(
            (a: ScoredContent, b: ScoredContent) =>
                b.directionScore - a.directionScore,
        )
        // drop scores and return just content
        .map((item: ScoredContent) => item.content)
}

export function getFilteredAndSortedContent(
    weights: DimensionScores
): Content[] {
    const content = contentModules
        .keys()
        .map((key: string): Content => {
            const raw: string = contentModules(key) as string
            return ContentSchema.parse(raw)
        })

    return filterAndSortedContent(content, weights)
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