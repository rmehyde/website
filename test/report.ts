// Builds a human-readable "why" report for a profile, using the REAL scoring/selection
// functions (and the real selection trace) — never a re-derivation. The committed snapshot
// of this report is both our shared visibility into decisions and a regression guard.

import {
    Dimension,
    DimensionScores,
    scoreContentCosine,
    scoreContentDotProduct,
    scoreContentAbsolute,
} from "@/app/lib/content/scoring";
import {
    selectJobDuties,
    filterAndSortedContent,
    passesThreshold,
    sortJobsByDate,
    DutyTrace,
} from "@/app/lib/content/load";
import { RESUME_THRESHOLD_OVERRIDES } from "@/app/lib/content/render";
import { Content, ContentTypeEnum, Job, BaseContent } from "@/app/lib/content/schema";
import { Profile } from "@/app/lib/content/profiles";

const RESUME_LINE_BUDGET = 14;
const MAX_PROJECTS = 5; // mirrors projectsAndOssToLatex's cap

const cos = (n: number) => n.toFixed(3);

// every dimension the item scores on, shown as weight x content = product (the dot terms),
//   biggest contribution first. Dims with content but zero weight still list (product 0) so the
//   content magnitude |C| is fully explained. No truncation — this is the whole picture.
function contribs(weights: DimensionScores, scores: DimensionScores): string {
    return Dimension.options
        .filter((d) => scores[d] > 0)
        .map((d) => ({ d, w: weights[d], c: scores[d], p: weights[d] * scores[d] }))
        .sort((a, b) => b.p - a.p || b.c - a.c)
        .map((x) => `${x.d} ${x.w}x${x.c}=${x.p}`)
        .join(", ");
}

// magnitude of the content vector — cosine divides the dot product by this, so a "bigger"
//   item (more/higher scores) is penalized relative to a leaner one with the same dot.
function contentNorm(scores: DimensionScores): number {
    return Math.sqrt(Dimension.options.reduce((s, d) => s + scores[d] * scores[d], 0));
}

function scoreLine(weights: DimensionScores, scores: DimensionScores): string {
    return `cos ${cos(scoreContentCosine(weights, scores))} | dot ${scoreContentDotProduct(weights, scores)} | |C| ${contentNorm(scores).toFixed(2)} | ${contribs(weights, scores)}`;
}

// describe the relevance gate (used to filter non-job content)
function gateLine(item: Content, weights: DimensionScores): string {
    const threshold = (RESUME_THRESHOLD_OVERRIDES as Record<string, number>)[item.contentType] ?? 0;
    const abs = scoreContentAbsolute(weights, item.scores);
    const passingDims = Dimension.options.filter((d) => abs[d] > threshold);
    const pass = passesThreshold(item, weights, RESUME_THRESHOLD_OVERRIDES);
    return pass
        ? `gate PASS (thr ${threshold}; ${passingDims.length} dim(s) over)`
        : `gate FAIL (thr ${threshold}; 0 dim(s) over)`;
}

const mark = (shown: boolean) => (shown ? "[x]" : "[ ]");
const phaseTag = (p: DutyTrace["phase"]) => (p ? p.padEnd(5) : "     ");

function dutyLines(duties: DutyTrace[], weights: DimensionScores, allByTitle: Map<string, Content>): string[] {
    const lines: string[] = [];
    for (const d of duties) {
        const scores = allByTitle.get(d.title)?.scores;
        const tail = scores ? ` | ${scoreLine(weights, scores)}` : ` | cos ${cos(d.cosine)}`;
        if (d.isParent) {
            const cut = d.shown ? "" : "  (cut: budget)";
            lines.push(`  ${mark(d.shown)}  ----  ${d.title} [parent header]${tail}${cut}`);
            for (const sub of d.subduties) {
                const subScores = allByTitle.get(sub.title)?.scores;
                const subTail = subScores ? ` | ${scoreLine(weights, subScores)}` : ` | cos ${cos(sub.cosine)}`;
                const subCut = sub.shown ? "" : "  (cut: budget)";
                lines.push(`        ${mark(sub.shown)}  ${phaseTag(sub.phase)} ${sub.title}${subTail}${subCut}`);
            }
        } else {
            const cut = d.shown ? "" : "  (cut: budget)";
            lines.push(`  ${mark(d.shown)}  ${phaseTag(d.phase)} ${d.title}${tail}${cut}`);
        }
    }
    return lines;
}

function nonJobSection(
    label: string,
    items: BaseContent[],
    weights: DimensionScores,
    cap?: number
): string[] {
    if (items.length === 0) return [];
    const lines = [`## ${label}  (${items.length})`];
    const shown = filterAndSortedContent(items as Content[], weights, RESUME_THRESHOLD_OVERRIDES) as unknown as BaseContent[];
    const shownTitles = new Set(shown.map((s) => s.title));

    shown.forEach((item, i) => {
        const capNote = cap !== undefined && i >= cap ? "  (cut: max " + cap + ")" : "";
        const rank = String(i + 1).padStart(2);
        lines.push(`  ${rank}. ${item.title} | ${scoreLine(weights, item.scores)} | ${gateLine(item as Content, weights)}${capNote}`);
    });

    const excluded = items.filter((it) => !shownTitles.has(it.title));
    for (const item of excluded) {
        lines.push(`   -- ${item.title} | ${scoreLine(weights, item.scores)} | ${gateLine(item as Content, weights)}  (excluded)`);
    }
    lines.push("");
    return lines;
}

export function buildRationaleReport(profile: Profile, allContent: Content[]): string {
    const weights = profile.scores;
    const allByTitle = new Map<string, Content>();
    const indexContent = (items: Content[]) => {
        for (const it of items) {
            allByTitle.set(it.title, it);
            if (it.contentType === ContentTypeEnum.enum.job) indexContent(it.duties as unknown as Content[]);
            if (it.contentType === ContentTypeEnum.enum.duty) indexContent(((it as any).subduties ?? []) as Content[]);
        }
    };
    indexContent(allContent);

    const lines: string[] = [];
    lines.push(`# ${profile.name}`);
    lines.push("");
    lines.push("weights: " + Dimension.options.map((d) => `${d}=${weights[d]}`).join("  "));
    lines.push("");

    // --- jobs ---
    const jobs = sortJobsByDate(allContent.filter((c): c is Job => c.contentType === ContentTypeEnum.enum.job));
    const { trace } = selectJobDuties(jobs, weights, RESUME_LINE_BUDGET);
    lines.push(`## Technical Roles  (job duty lines: ${trace.linesUsed}/${trace.lineBudget})`);
    for (const jt of trace.jobs) {
        lines.push("");
        lines.push(`### ${jt.company} - ${jt.title}`);
        lines.push(...dutyLines(jt.duties, weights, allByTitle));
    }
    lines.push("");

    // --- non-jobs ---
    const ofType = (t: Content["contentType"]) => allContent.filter((c) => c.contentType === t) as unknown as BaseContent[];
    lines.push(...nonJobSection("Projects", ofType(ContentTypeEnum.enum.project), weights, MAX_PROJECTS));
    lines.push(...nonJobSection("Open Source", ofType(ContentTypeEnum.enum.oss), weights));
    lines.push(...nonJobSection("Education", ofType(ContentTypeEnum.enum.education), weights));
    lines.push(...nonJobSection("Soft Skills", ofType(ContentTypeEnum.enum["soft-skill"]), weights));
    lines.push(...nonJobSection("Technical Skills", ofType(ContentTypeEnum.enum["technical-skill"]), weights));

    return lines.join("\n").trimEnd() + "\n";
}
