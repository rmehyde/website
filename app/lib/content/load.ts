import {DimensionScores, scoreContent} from "@/app/lib/content/scoring";
import {ContentSchema, Content, ContentByType, ContentTypeEnum, Job, Duty} from "@/app/lib/content/schema";

// load all .yaml/.yml content files as objects at build time
const contentModules = (require as any).context(
    '@/public/content',
    true,
    /\.(?:ya?ml)$/
)

function filterAndSortJobDuties(job: Job, weights: DimensionScores): Job {
    type ScoredDuty = {
        duty: Duty
        score: number
    }

    const scoreDuty = (duty: Duty): number => {
        const dutyScores: Record<string, number> = scoreContent(
            weights,
            duty.scores
        )
        return Object.values(dutyScores)
            .filter((v: number) => v > 0)
            .reduce((sum: number, v: number) => sum + v, 0)
    }

    const processDuty = (duty: Duty): ScoredDuty => {
        const subduties: Duty[] = ((duty as any).subduties ?? []) as Duty[]

        const processedSubduties: ScoredDuty[] = subduties
            .map(processDuty)
            .filter((d: ScoredDuty) => d.score > 0)
            .sort((a: ScoredDuty, b: ScoredDuty) => b.score - a.score)

        const newDuty: Duty = {
            ...duty,
            ...(processedSubduties.length > 0
                ? { subduties: processedSubduties.map((d: ScoredDuty) => d.duty) }
                : {}),
        } as Duty

        const ownScore: number = scoreDuty(duty)

        return { duty: newDuty, score: ownScore }
    }

    const scoredDuties: ScoredDuty[] = job.duties
        .map(processDuty)
        .filter((d: ScoredDuty) => d.score > 0)
        .sort((a: ScoredDuty, b: ScoredDuty) => b.score - a.score)

    return {
        ...job,
        duties: scoredDuties.map((d: ScoredDuty) => d.duty),
    }
}


// TODO: maybe we should be averaging by number of dimensions specified in content to determine relevancy?
//  e.g. TreeTime is always first under Dstillery cause it has 3 dimensions, but how well do those actually line up
//  with user input dims?
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
            let parsed: Content = ContentSchema.parse(raw)
            const contentScores: Record<string, number> = scoreContent(
                weights,
                parsed.scores
            )
            const totalScore: number = Object.values(contentScores)
                .filter((v: number) => v > 0)
                .reduce((sum: number, v: number) => sum + v, 0)

            // if it's a Job, give the same treatment to inner duties
            if (parsed.contentType === ContentTypeEnum.enum.job) {
                console.log(`filtering and sorting duties in ${parsed.title}`)
                parsed = filterAndSortJobDuties(parsed as Job, weights);
            }
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
