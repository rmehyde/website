import {DimensionScores} from "@/app/lib/content/scoring";
import {getFilteredAndSortedContent, groupContentByType, sortJobsByDate} from "@/app/lib/content/load";
import {jobToLatex, projectsAndOssToLatex, projectsAndOssLines, educationToLatex, softSkillsToLatex, technicalSkillsToLatex, SKILLS_WIDTH_BUDGET} from "@/app/lib/content/latex";
import {estimateLines} from "@/app/lib/content/estimate";
import mustache from "mustache";
import {ContactInfo} from "@/app/lib/contact/contact-store";
import {Content, ContentTypeEnum} from "@/app/lib/content/schema";

// thresholds keep skills from being filtered out by the relevance gate
export const RESUME_THRESHOLD_OVERRIDES = {
    'soft-skill': -5,      // Never filter soft skills (minimal threshold)
    'technical-skill': -4  // Almost never filter technical skills (one step up from never)
}

// printed lines one page holds across the sections that vary: job bullets, projects, open source, and
//   technical skills. everything else (header, section and job titles, education, soft skills) is fixed.
//   THE one-page calibration knob
export const RESUME_PAGE_LINES = 28

// lines left for job bullets once the other varying sections are estimated from their char counts.
//   the unlimited budget counts every duty as shown, so all covered projects are excluded; the project
//   list would only differ from the final one if a covered duty then missed the real budget.
export function jobLineBudget(allContent: Content[], weights: DimensionScores): number {
    const nonJobs = groupContentByType(
        getFilteredAndSortedContent(allContent, weights, Infinity, RESUME_THRESHOLD_OVERRIDES)
    )
    return RESUME_PAGE_LINES - projectsAndOssLines(nonJobs) - estimateLines(SKILLS_WIDTH_BUDGET)
}

// pure resume builder: given the content, the template, weights and contact, produce LaTeX.
//   no build-time I/O — content and template are supplied by the caller's adapter
//   (webpack for the site, fs for tests), so the rendering logic is single-source.
export function buildResumeLatex(opts: {
    allContent: Content[]
    template: string
    weights: DimensionScores
    contact: ContactInfo
    // printed lines available for job bullets; defaults to what's left on the page
    lineBudget?: number
}): string {
    const {allContent, template, weights, contact, lineBudget = jobLineBudget(allContent, weights)} = opts

    const selected = getFilteredAndSortedContent(allContent, weights, lineBudget, RESUME_THRESHOLD_OVERRIDES)
    const contentByType = groupContentByType(selected)
    const projectsOssContent = projectsAndOssToLatex(contentByType);
    const jobsContent = sortJobsByDate(contentByType[ContentTypeEnum.enum.job])
        .map(job => jobToLatex(job)).join("\n")
    const educationContent = educationToLatex(contentByType[ContentTypeEnum.enum.education]);
    const softSkillsContent = softSkillsToLatex(contentByType[ContentTypeEnum.enum["soft-skill"]]);
    const technicalSkillsContent = technicalSkillsToLatex(contentByType[ContentTypeEnum.enum["technical-skill"]]);
    return mustache.render(
        template,
        {
            jobsContent,
            projectsOssContent,
            educationContent,
            softSkillsContent,
            technicalSkillsContent,
            email: contact.email,
            phone: contact.phone,
        }
    );
}
