import {DimensionScores, scoreContentAbsolute, scoreContentComposite, scoreContentCosine} from "@/app/lib/content/scoring";
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

// minimum duties shown per job, so a job never renders with a bare header
// TODO: revisit — should a job fully irrelevant to the selected profile be omitted instead?
const DUTY_FLOOR = 2

function sortByCosine<T extends { scores: DimensionScores }>(items: T[], weights: DimensionScores): T[] {
    return [...items].sort(
        (a, b) => scoreContentCosine(weights, b.scores) - scoreContentCosine(weights, a.scores)
    )
}

// order a job's duties (and their subduties) by relevance, keeping all of them
function withSortedDuties(job: Job, weights: DimensionScores): Job {
    return {
        ...job,
        duties: sortByCosine(job.duties as Duty[], weights).map(duty => ({
            ...duty,
            subduties: sortByCosine((duty.subduties ?? []) as Duty[], weights),
        })) as Duty[],
    }
}

// choose which duties/subduties to show across all jobs, fitting a rendered-line budget.
//   units are "leaves": standalone duties, and individual subduties — each renders as one bullet.
//   phase 1 (floor): every job keeps its top-DUTY_FLOOR top-level duties, so no job is bare.
//   phase 2 (fill):  the best remaining leaves globally; choosing a subduty grabs its parent
//                    header (+1 line), and a shown parent always carries >=1 subduty.
//   the floor is a guarantee — honored even if it pushes past the budget.
//   TODO: line-awareness — a long summary spills to 2 lines (estimate from char count).
function selectJobDuties(jobs: Job[], weights: DimensionScores, lineBudget: number): Job[] {
    const cos = (item: { scores: DimensionScores }) => scoreContentCosine(weights, item.scores)
    const subdutiesOf = (duty: Duty): Duty[] => (duty.subduties ?? []) as Duty[]

    const chosen = new Set<Duty>()        // chosen leaves (standalone duties + subduties)
    const shownParents = new Set<Duty>()  // parent duties whose header is visible
    let used = 0

    const parentCost = (parent: Duty | null) => (parent && !shownParents.has(parent) ? 1 : 0)
    const addLeaf = (parent: Duty | null, leaf: Duty) => {
        if (chosen.has(leaf)) return
        used += 1 + parentCost(parent)
        chosen.add(leaf)
        if (parent) shownParents.add(parent)
    }

    const jobDuties = jobs.map(job => sortByCosine(job.duties as Duty[], weights))

    // phase 1: floor — top-DUTY_FLOOR top-level duties per job; a parent shows via its best subduty
    jobDuties.forEach(duties => {
        duties.slice(0, DUTY_FLOOR).forEach(duty => {
            const subs = subdutiesOf(duty)
            if (subs.length > 0) addLeaf(duty, sortByCosine(subs, weights)[0])
            else addLeaf(null, duty)
        })
    })

    // phase 2: fill — best remaining leaves globally, each subduty grabbing its parent header
    const leaves: { parent: Duty | null; leaf: Duty }[] = jobDuties.flat().flatMap(duty => {
        const subs = subdutiesOf(duty)
        return subs.length > 0
            ? subs.map(sub => ({ parent: duty as Duty | null, leaf: sub }))
            : [{ parent: null as Duty | null, leaf: duty }]
    })
    leaves
        .filter(({ leaf }) => !chosen.has(leaf))
        .sort((a, b) => cos(b.leaf) - cos(a.leaf))
        .forEach(({ parent, leaf }) => {
            if (used + 1 + parentCost(parent) <= lineBudget) addLeaf(parent, leaf)
        })

    // rebuild: all jobs kept; standalone duties chosen, parents with >=1 chosen subduty; relevance order
    return jobs.map((job, i) => ({
        ...job,
        duties: jobDuties[i]
            .filter(duty => {
                const subs = subdutiesOf(duty)
                return subs.length > 0 ? shownParents.has(duty) : chosen.has(duty)
            })
            .map(duty => {
                const subs = subdutiesOf(duty)
                return subs.length === 0
                    ? duty
                    : { ...duty, subduties: sortByCosine(subs, weights).filter(sub => chosen.has(sub)) } as Duty
            }),
    }))
}

export function getFilteredAndSortedContent(
    weights: DimensionScores,
    lineBudget?: number,
    thresholdOverrides: Record<string, number> = {}
): Content[] {
    const content: Content[] = contentModules
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

    const jobs = content.filter((c): c is Job => c.contentType === ContentTypeEnum.enum.job)
    const nonJobs = content.filter(c => c.contentType !== ContentTypeEnum.enum.job)

    // non-jobs (projects, oss, skills, education): filtered + sorted by relevance as before
    const sortedNonJobs = filterAndSortedContent(nonJobs, weights, thresholdOverrides)

    // jobs: always shown; duties chosen by floor + line budget, not the relevance filter
    const selectedJobs = lineBudget !== undefined
        ? selectJobDuties(jobs, weights, lineBudget)
        : jobs.map(job => withSortedDuties(job, weights))

    return [...selectedJobs, ...sortedNonJobs]
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