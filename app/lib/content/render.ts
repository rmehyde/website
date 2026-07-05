import {DimensionScores} from "@/app/lib/content/scoring";
import {getFilteredAndSortedContent, groupContentByType, sortJobsByDate} from "@/app/lib/content/load";
import {jobToLatex, projectsAndOssToLatex, educationToLatex, softSkillsToLatex, technicalSkillsToLatex} from "@/app/lib/content/latex";
import mustache from "mustache";
import {ContactInfo} from "@/app/lib/contact/contact-store";
import {Content, ContentTypeEnum} from "@/app/lib/content/schema";

// thresholds keep skills from being filtered out by the relevance gate
export const RESUME_THRESHOLD_OVERRIDES = {
    'soft-skill': -5,      // Never filter soft skills (minimal threshold)
    'technical-skill': -4  // Almost never filter technical skills (one step up from never)
}

// pure resume builder: given the content, the template, weights and contact, produce LaTeX.
//   no build-time I/O — content and template are supplied by the caller's adapter
//   (webpack for the site, fs for tests), so the rendering logic is single-source.
export function buildResumeLatex(opts: {
    allContent: Content[]
    template: string
    weights: DimensionScores
    contact: ContactInfo
    // rendered bullet-lines available for the jobs section — THE one-page calibration knob
    lineBudget?: number
}): string {
    const {allContent, template, weights, contact, lineBudget = 14} = opts

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
