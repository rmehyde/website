import {DimensionScores} from "@/app/lib/content/scoring";
import {buildResumeLatex, jobLineBudget} from "@/app/lib/content/render";
import {loadAllContent, getResumeTemplate} from "@/app/lib/content/content-io";
import {ContactInfo} from "@/app/lib/contact/contact-store";

// site entry point: wires the webpack content/template adapters into the pure builder.
export function generateResumeLatex(
    weights: DimensionScores,
    contact: ContactInfo,
    // job-bullet lines to give up from the estimated budget, after a compile overflowed the page
    trimLines: number = 0
): string {
    const allContent = loadAllContent()
    return buildResumeLatex({
        allContent,
        template: getResumeTemplate(),
        weights,
        contact,
        lineBudget: jobLineBudget(allContent, weights) - trimLines,
    })
}
