import {DimensionScores, scoreContentAbsolute, scoreContentCosine} from "@/app/lib/content/scoring";
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
        const dutyScores: Record<string, number> = scoreContentAbsolute(
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
        (content: Content): ScoredContent => {
            const contentScores = scoreContentAbsolute(
                weights,
                content.scores
            );
            const cosineScore = scoreContentCosine(weights, content.scores);

            // if it's a Job, give the same treatment to inner duties
            if (content.contentType === ContentTypeEnum.enum.job) {
                console.log(`filtering and sorting duties in ${content.title}`)
                content = filterAndSortJobDuties(content as Job, weights);
            }
            return { content: content, absoluteScores: contentScores, directionScore: cosineScore }
        })

    return scoredArray
        // filter to "has any dimension greater than zero"
        .filter((item: ScoredContent) => Object.values(item.absoluteScores).some(v => v > 0))
        // sort by direction similarity (inverting since it sorts ascending)
        .toSorted((a: ScoredContent, b: ScoredContent) => b.directionScore - a.directionScore)
        // drop scores and return just content
        .map((item: ScoredContent) => item.content)
}

// TODO: maybe we should be averaging by number of dimensions specified in content to determine relevancy?
//  e.g. TreeTime is always first under Dstillery cause it has 3 dimensions, but how well do those actually line up
//  with user input dims?
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
