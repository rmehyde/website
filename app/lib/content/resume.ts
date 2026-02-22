import {DimensionScores} from "@/app/lib/content/scoring";
import {getFilteredAndSortedContent, groupContentByType, sortJobsByDate} from "@/app/lib/content/load";
import {jobToLatex, loadTemplate, projectsAndOssToLatex, educationToLatex, softSkillsToLatex} from "@/app/lib/content/latex";
import mustache from "mustache";
import {ContactInfo} from "@/app/contact/contactContext";
import {ContentTypeEnum} from "@/app/lib/content/schema";

export async function generateResumeLatex(
    weights: DimensionScores, 
    contact: ContactInfo, 
    budget: number = 50
): Promise<String> {
    const allContent = getFilteredAndSortedContent(weights, budget, {
        'soft-skill': -5  // Never filter soft skills (minimal threshold)
    })
    const contentByType = groupContentByType(allContent)
    const projectsOssContent = projectsAndOssToLatex(contentByType);
    const jobsContent = sortJobsByDate(contentByType[ContentTypeEnum.enum.job])
        .map(job => jobToLatex(job)).join("\n")
    const educationContent = educationToLatex(contentByType[ContentTypeEnum.enum.education]);
    const softSkillsContent = softSkillsToLatex(contentByType[ContentTypeEnum.enum["soft-skill"]]);
    const template = await loadTemplate("/templates/resume.tex.mustache")
    const latex = mustache.render(
        template,
        {
            jobsContent,
            projectsOssContent,
            educationContent,
            softSkillsContent,
            email: contact.email,
            phone: contact.phone,
        }
    );
    return latex;
}
