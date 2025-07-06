import {DimensionScores} from "@/app/lib/content/scoring";
import {filterAndSortContent, groupContentByType} from "@/app/lib/content/load";
import {baseContentToLatex, jobToLatex, loadTemplate, projectsToLatex, Verbosity} from "@/app/lib/content/latex";
import mustache from "mustache";
import {ContactInfo} from "@/app/contact/contactContext";
import {ContentByType, ContentTypeEnum} from "@/app/lib/content/schema";
import dedent from "dedent";

// TODO: move to another module
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
        // TODO: the second vspace isn't doing anything?
        ? dedent(String.raw`
            \vspace{-.5em}
            \par\noindent
            \makebox[\linewidth][c]{\rule{0.25\linewidth}{0.75pt}}
            \vspace{-1.25em}
            \par\noindent
            `)
        : ""
    console.log(projectsContent, ossContent)
    return projectsContent + maybeSeparator + ossContent;
}

export async function generateResumeLatex(weights: DimensionScores, contact: ContactInfo) {
    const allContent = filterAndSortContent(weights)
    const contentByType = groupContentByType(allContent)
    const projectsOssContent = projectsAndOssToLatex(contentByType);
    // TODO: need to score duties within jobs, filter, sort, etc. also ensure jobs are sorted by date :)
    const jobsContent = contentByType[ContentTypeEnum.enum.job].map(job => jobToLatex(job)).join("\n")
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
    console.log(latex);
    return latex;
}
