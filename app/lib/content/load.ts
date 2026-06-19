import {DimensionScores, scoreContentAbsolute, scoreContentComposite, scoreContentCosine} from "@/app/lib/content/scoring";
import {ContentSchema, Content, ContentByType, ContentTypeEnum, Job, Duty} from "@/app/lib/content/schema";

// parse one loaded module's contents (single object or array) into validated Content.
//   shared by every content adapter (webpack require.context, fs-based tests) so the
//   validation/normalization lives in exactly one place.
export function parseContentEntries(raw: unknown): Content[] {
    if (Array.isArray(raw)) {
        return raw.map(item => ContentSchema.parse(item))
    }
    return [ContentSchema.parse(raw)]
}

// the relevance gate used for filtering: is any dimension's combined score above threshold?
//   exported so callers (and the rationale report) share one definition of "relevant".
export function passesThreshold(
    item: Content,
    weights: DimensionScores,
    thresholdOverrides: Record<string, number> = {}
): boolean {
    const threshold = thresholdOverrides[item.contentType] ?? 0
    const absoluteScores = scoreContentAbsolute(weights, item.scores)
    return Object.values(absoluteScores).some(v => v > threshold)
}

export function filterAndSortedContent(
    content: Content[],
    weights: DimensionScores,
    thresholdOverrides: Record<string, number> = {}
): Content[] {
    type ScoredContent = {
        content: Content
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

            const compositeScores = scoreContentComposite(
                weights,
                updatedContent.scores,
            )

            return {
                content: updatedContent,
                compositeScores,
            }
        })

    return scoredArray
        // filter using threshold (default 0, with per-content-type overrides)
        .filter((item: ScoredContent) => passesThreshold(item.content, weights, thresholdOverrides))
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
export const DUTY_FLOOR = 2

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

// rationale trace describing how each duty/subduty fared in budget-aware selection.
//   produced alongside the selection itself so the "why" is the real decision, never a re-derivation.
export type DutyTrace = {
    title: string
    cosine: number
    isParent: boolean       // has subduties (renders only as a header)
    shown: boolean          // leaf: chosen as a bullet; parent: header is visible
    phase: 'floor' | 'fill' | null  // which selection phase chose this leaf (null for parents)
    subduties: DutyTrace[]
}
export type JobTrace = { company: string; title: string; duties: DutyTrace[] }
export type SelectionTrace = { jobs: JobTrace[]; linesUsed: number; lineBudget: number }

// choose which duties/subduties to show across all jobs, fitting a rendered-line budget.
//   units are "leaves": standalone duties, and individual subduties — each renders as one bullet.
//   phase 1 (floor): every job keeps its top-DUTY_FLOOR top-level duties, so no job is bare.
//   phase 2 (fill):  the best remaining leaves globally; choosing a subduty grabs its parent
//                    header (+1 line), and a shown parent always carries >=1 subduty.
//   the floor is a guarantee — honored even if it pushes past the budget.
//   returns the selected jobs plus a trace of every duty's fate for the rationale report.
//   TODO: line-awareness — a long summary spills to 2 lines (estimate from char count).
export function selectJobDuties(
    jobs: Job[],
    weights: DimensionScores,
    lineBudget: number
): { jobs: Job[]; trace: SelectionTrace } {
    const cos = (item: { scores: DimensionScores }) => scoreContentCosine(weights, item.scores)
    const subdutiesOf = (duty: Duty): Duty[] => (duty.subduties ?? []) as Duty[]

    const chosen = new Set<Duty>()        // chosen leaves (standalone duties + subduties)
    const shownParents = new Set<Duty>()  // parent duties whose header is visible
    const phaseOf = new Map<Duty, 'floor' | 'fill'>()  // which phase chose each leaf
    let used = 0

    const parentCost = (parent: Duty | null) => (parent && !shownParents.has(parent) ? 1 : 0)
    const addLeaf = (parent: Duty | null, leaf: Duty, phase: 'floor' | 'fill') => {
        if (chosen.has(leaf)) return
        used += 1 + parentCost(parent)
        chosen.add(leaf)
        phaseOf.set(leaf, phase)
        if (parent) shownParents.add(parent)
    }

    const jobDuties = jobs.map(job => sortByCosine(job.duties as Duty[], weights))

    // phase 1: floor — top-DUTY_FLOOR top-level duties per job; a parent shows via its best subduty
    jobDuties.forEach(duties => {
        duties.slice(0, DUTY_FLOOR).forEach(duty => {
            const subs = subdutiesOf(duty)
            if (subs.length > 0) addLeaf(duty, sortByCosine(subs, weights)[0], 'floor')
            else addLeaf(null, duty, 'floor')
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
            if (used + 1 + parentCost(parent) <= lineBudget) addLeaf(parent, leaf, 'fill')
        })

    // rebuild: all jobs kept; standalone duties chosen, parents with >=1 chosen subduty; relevance order
    const selectedJobs = jobs.map((job, i) => ({
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

    // trace: every duty's fate, in the same relevance order used for selection
    const trace: SelectionTrace = {
        lineBudget,
        linesUsed: used,
        jobs: jobs.map((job, i) => ({
            company: job.company,
            title: job.title,
            duties: jobDuties[i].map(duty => {
                const subs = subdutiesOf(duty)
                const isParent = subs.length > 0
                return {
                    title: duty.title,
                    cosine: cos(duty),
                    isParent,
                    shown: isParent ? shownParents.has(duty) : chosen.has(duty),
                    phase: isParent ? null : (phaseOf.get(duty) ?? null),
                    subduties: sortByCosine(subs, weights).map(sub => ({
                        title: sub.title,
                        cosine: cos(sub),
                        isParent: false,
                        shown: chosen.has(sub),
                        phase: phaseOf.get(sub) ?? null,
                        subduties: [],
                    })),
                }
            }),
        })),
    }

    return { jobs: selectedJobs, trace }
}

export function getFilteredAndSortedContent(
    allContent: Content[],
    weights: DimensionScores,
    lineBudget?: number,
    thresholdOverrides: Record<string, number> = {}
): Content[] {
    const jobs = allContent.filter((c): c is Job => c.contentType === ContentTypeEnum.enum.job)
    const nonJobs = allContent.filter(c => c.contentType !== ContentTypeEnum.enum.job)

    // non-jobs (projects, oss, skills, education): filtered + sorted by relevance as before
    const sortedNonJobs = filterAndSortedContent(nonJobs, weights, thresholdOverrides)

    // jobs: always shown; duties chosen by floor + line budget, not the relevance filter
    const selectedJobs = lineBudget !== undefined
        ? selectJobDuties(jobs, weights, lineBudget).jobs
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
