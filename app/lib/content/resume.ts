import {DimensionScores} from "@/app/lib/content/scoring";
import {buildResumeLatex} from "@/app/lib/content/render";
import {loadAllContent, getResumeTemplate} from "@/app/lib/content/content-io";
import {ContactInfo} from "@/app/contact/contactContext";

// site entry point: wires the webpack content/template adapters into the pure builder.
export function generateResumeLatex(
    weights: DimensionScores,
    contact: ContactInfo,
    lineBudget: number = 14
): string {
    return buildResumeLatex({
        allContent: loadAllContent(),
        template: getResumeTemplate(),
        weights,
        contact,
        lineBudget,
    })
}
