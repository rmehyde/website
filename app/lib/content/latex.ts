import {BaseContent, ContentByType, ContentTypeEnum, Duty, Job, Link, Project, Education, SoftSkill, TechnicalSkill} from "@/app/lib/content/schema";
import dedent from "dedent";

const SITE_URL = "https://rmehyde.com";

export enum Verbosity {
    Concise = "Concise",
    Verbose = "Verbose",
}

export function escapeLatex(str: string): string {
    return str
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\^/g, '\\^{}')
        .replace(/~/g, '\\~{}');
}

export function linksToLatex(links: Link[] | undefined, verbosity: Verbosity): string {
    if (links === undefined || links.length === 0) {
        return ""
    }
    switch (verbosity) {
        case Verbosity.Concise:
            const hyperlinks = links.map(link =>
                `\\uhref{${escapeLatex(link.target)}}{(${escapeLatex(link.tag)})}`
            ).join(', ')
            return `\\textsuperscript{${hyperlinks}}`
        case Verbosity.Verbose:
            return links.map((link, i) => {
                const href = link.target.startsWith('/') ? SITE_URL + link.target : link.target;
                    const label =
                        i === 0
                            ? link.detail
                            : link.detail.charAt(0).toLowerCase() + link.detail.slice(1)
                    return `\\uhref{${escapeLatex(href)}}{${escapeLatex(label)}}`
                }
            ).join(" or ")
    }
}

export function baseContentToLatex(
    contentList: BaseContent[],
    verbosity: Verbosity,
    includeLinks: boolean = true,
): string {
    switch (verbosity) {
        case Verbosity.Concise:
            return (contentList.length > 0 ? `\\leadbullet\n` : "") +
                contentList.map(item => {
                // ":~" ties the first word of the summary to the title with a non-breaking space,
                // so the title can never sit alone with its description orphaned to the next line
                return `\\textbf{${escapeLatex(item.title)}}:~${escapeLatex(item.summary)}` +
                    // tie the link superscript to the last word with a non-breaking space (~),
                    // so the link never wraps onto its own line — it moves with the word or not at all
                    (includeLinks ? "~" + linksToLatex(item.links, verbosity) : "")
            }).join(`\\bulletspace\n`)
        case Verbosity.Verbose:
            return contentList.map(item => {
                return dedent(String.raw`
                    \section*{${escapeLatex(item.title)}}
                    ${escapeLatex(item.detail)}`
                    + (includeLinks ? String.raw`
                    \noindent
                    ${linksToLatex(item.links, verbosity)}`
                        : "")
                );
            }).join("\n");
    }
}

export function projectsToLatex(
    projects: Project[],
    verbosity: Verbosity,
    maxProjects: number | null = null,
    includeLinks: boolean = true,
): string {
    let suffix = "";
    if (maxProjects !== null && projects.length > maxProjects) {
        projects = projects.slice(0, maxProjects);
        // TODO: in the future it would be kinda cool if this took you to a projects page with the scores as
        //  the ones used to generate this resume
        suffix = `\\bulletspace\n(\\& more at \\blkuhref{https://rmehyde.com/projects}{rmehyde.com})\n`;
    }
    return baseContentToLatex(projects, verbosity, includeLinks) + suffix;
}


function isoDateToString(isoDate: string): string {
    const [year, month] = isoDate.split("-").map(Number);
    const monthNameShort = new Date(0, month - 1).toLocaleString("en", { month: "short" });
    const monthNameLong = new Date(0, month - 1).toLocaleString("en", { month: "long" });
    const monthName = monthNameShort + (monthNameShort == monthNameLong ? "" : ".")
    return `${monthName} ${year}`;
}


function jobDutyToLatex(duty: Duty): string {
    // tie the link superscript to the last word with a non-breaking space (~) so it never
    // orphans onto its own line; drop the separator entirely when there are no links
    const links = linksToLatex(duty.links, Verbosity.Concise)
    const lines = [`  \\item ${escapeLatex(duty.summary)}` + (links ? "~" + links : "")]
    if (duty.subduties.length > 0) {
        lines.push("\\begin{itemize}")
        lines.push(...duty.subduties.map(jobDutyToLatex));
        lines.push("\\end{itemize}")
    }
    return lines.join('\n');
}

export function jobToLatex(job: Job): string {
    const rolesString = job.roles.join(" \\rightarr\\ ");
    const titleString = rolesString + ", " + job.company;
    const startString = isoDateToString(job.start);
    const endString = job.end ? isoDateToString(job.end) : "Present";
    const locTimeString = `${job.location}~~\\textemdash~~{${startString}}\\textendash{${endString}}`;
    // TODO: larger font, spacing
    const header = `\\textbf{${titleString} \\hfill ${locTimeString}}`
    const items = job.duties.map(jobDutyToLatex).join('\n');
    return header + "\n\\begin{itemize}\n" + items + "\n\\end{itemize}";
}


export function projectsAndOssToLatex(content: ContentByType) {
    const projectsContent = projectsToLatex(
        content[ContentTypeEnum.enum.project],
        Verbosity.Concise,
        5,
        false,
    );
    const ossContent = baseContentToLatex(
        content[ContentTypeEnum.enum.oss],
        Verbosity.Concise,
        true
    );
    const maybeSeparator = (projectsContent.length > 0 && ossContent.length > 0)
        ? dedent(String.raw`
            \vspace{-.25em}
            \par\noindent
            \makebox[\linewidth][c]{\rule{0.25\linewidth}{0.75pt}}
            \vspace{-1em}
            \par\noindent
            `)
        : ""
    return projectsContent + maybeSeparator + ossContent;
}

export function educationToLatex(education: Education[]): string {
    return education.map(edu => {
        const degreeYear = `${escapeLatex(edu.degree)}, ${edu.year}`;
        const institutionLocation = `${escapeLatex(edu.institution)}, ${escapeLatex(edu.location)}`;
        return `${institutionLocation} — ${degreeYear}`;
    }).join("\\\\\n");
}

export function softSkillsToLatex(softSkills: SoftSkill[]): string {
    return softSkills.map(skill => 
        `\\item ${escapeLatex(skill.summary)}`
    ).join("\n");
}

// approximate printed-width budget for the inline technical-skills line, in characters.
//   each item costs 3 (leading space + bullet + space) plus its visible text length.
//   the list arrives relevance-sorted, so the budget trims the least-relevant tail. Tune to fit two lines.
export const SKILLS_WIDTH_BUDGET = 195

// always present — the wink. its width is reserved up front so it never tips the line over.
const MORE_SUFFIX = " \\tb~(\\&~more)";
const MORE_COST = 3 + "(& more)".length; // same 3-per-item convention + its visible text

export function technicalSkillsToLatex(
    technicalSkills: TechnicalSkill[],
    widthBudget: number = SKILLS_WIDTH_BUDGET
): string {
    const shown: string[] = [];
    let used = MORE_COST; // reserve the always-on "& more" before fitting any skills
    for (const skill of technicalSkills) {
        const cost = 3 + skill.title.length; // space + bullet + space, then the visible text
        if (shown.length > 0 && used + cost > widthBudget) break;
        shown.push(escapeLatex(skill.title));
        used += cost;
    }
    const body = shown.map(s => s.replace(" ", "~")).join(" \\tb~");
    return "\\tb~" + body + MORE_SUFFIX;
}