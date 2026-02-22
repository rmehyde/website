import {DimensionScores} from "@/app/lib/content/scoring";
import {getFilteredAndSortedContent, groupContentByType, sortJobsByDate} from "@/app/lib/content/load";
import {jobToLatex, loadTemplate, projectsAndOssToLatex} from "@/app/lib/content/latex";
import mustache from "mustache";
import {ContactInfo} from "@/app/contact/contactContext";
import {ContentTypeEnum} from "@/app/lib/content/schema";

export async function generateResumeLatex(weights: DimensionScores, contact: ContactInfo): Promise<String> {
    const allContent = getFilteredAndSortedContent(weights)
    const contentByType = groupContentByType(allContent)
    const projectsOssContent = projectsAndOssToLatex(contentByType);
    // TODO: need to score duties within jobs, filter, sort, etc. also ensure jobs are sorted by date :)
    // TODO: also need to render subduties
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
