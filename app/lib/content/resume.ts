import {DimensionScores} from "@/app/lib/content/scoring";
import {getFilteredAndSortedContent, groupContentByType, sortJobsByDate} from "@/app/lib/content/load";
import {jobToLatex, loadTemplate, projectsAndOssToLatex} from "@/app/lib/content/latex";
import mustache from "mustache";
import {ContactInfo} from "@/app/contact/contactContext";
import {ContentTypeEnum} from "@/app/lib/content/schema";

export async function generateResumeLatex(
    weights: DimensionScores, 
    contact: ContactInfo, 
    budget: number = 50
): Promise<String> {
    const allContent = getFilteredAndSortedContent(weights, budget)
    const contentByType = groupContentByType(allContent)
    const projectsOssContent = projectsAndOssToLatex(contentByType);
    const jobsContent = sortJobsByDate(contentByType[ContentTypeEnum.enum.job])
        .map(job => jobToLatex(job)).join("\n")
    const template = await loadTemplate("/templates/resume.tex.mustache")
    const latex = mustache.render(
        template,
        {
            jobsContent,
            projectsOssContent,
            email: contact.email,
            phone: contact.phone,
        }
    );
    return latex;
}
