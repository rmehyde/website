// Report GENERATOR — not a content assertion. Run with `pnpm report`.
//   Writes a per-profile rationale (.md) and the rendered LaTeX (.tex) to /reports.
//   These are committed ARTIFACTS: you get change-visibility from `git diff reports/`,
//   not from a failing test. Nothing here pins specific scores/content, so tuning never
//   breaks it. The only assertion is "we produced non-empty output".

import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadAllContent, loadProfiles, getResumeTemplate } from "./content-fs";
import { buildRationaleReport } from "./report";
import { buildResumeLatex } from "@/app/lib/content/render";

const REPORTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
const CONTACT = { email: "you@example.com", phone: "+1 (555) 555-5555" };
const slug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

describe("generate per-profile reports (artifacts, not assertions)", () => {
    const allContent = loadAllContent();
    const profiles = loadProfiles();
    const template = getResumeTemplate();
    mkdirSync(REPORTS_DIR, { recursive: true });

    for (const profile of profiles) {
        it(`writes report + latex for ${profile.name}`, () => {
            const report = buildRationaleReport(profile, allContent);
            const latex = buildResumeLatex({ allContent, template, weights: profile.scores, contact: CONTACT });
            writeFileSync(join(REPORTS_DIR, `${slug(profile.name)}.md`), report);
            writeFileSync(join(REPORTS_DIR, `${slug(profile.name)}.tex`), latex);
            expect(report.length).toBeGreaterThan(0);
            expect(latex.length).toBeGreaterThan(0);
        });
    }
});
