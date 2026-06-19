import {DimensionScores} from "@/app/lib/content/scoring";
import {getFilteredAndSortedContent, groupContentByType, sortJobsByDate} from "@/app/lib/content/load";
import {jobToLatex, getTemplate, projectsAndOssToLatex, educationToLatex, softSkillsToLatex, technicalSkillsToLatex} from "@/app/lib/content/latex";
import mustache from "mustache";
import {ContactInfo} from "@/app/contact/contactContext";
import {ContentTypeEnum} from "@/app/lib/content/schema";

export function generateResumeLatex(
    weights: DimensionScores,
    contact: ContactInfo,
    // rendered bullet-lines available for the jobs section — THE one-page calibration knob
    lineBudget: number = 14
): string {
    const allContent = getFilteredAndSortedContent(weights, lineBudget, {
        'soft-skill': -5,      // Never filter soft skills (minimal threshold)
        'technical-skill': -4  // Almost never filter technical skills (one step up from never)
    })
    const contentByType = groupContentByType(allContent)
    const projectsOssContent = projectsAndOssToLatex(contentByType);
    const jobsContent = sortJobsByDate(contentByType[ContentTypeEnum.enum.job])
        .map(job => jobToLatex(job)).join("\n")
    const educationContent = educationToLatex(contentByType[ContentTypeEnum.enum.education]);
    const softSkillsContent = softSkillsToLatex(contentByType[ContentTypeEnum.enum["soft-skill"]]);
    const technicalSkillsContent = technicalSkillsToLatex(contentByType[ContentTypeEnum.enum["technical-skill"]]);
    const template = getTemplate('resume')
    const latex = mustache.render(
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
    return latex;
}
