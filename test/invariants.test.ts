// Content-AGNOSTIC invariants. Run with `pnpm test`.
//   These assert structural truths that must hold no matter how scores/content are tuned,
//   so they never break during normal tuning — they only fire on real mistakes (typo'd
//   dimension key silently dropped by Zod, a job rendered with no duties, budget blown, etc).

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { loadAllContent, loadProfiles, getResumeTemplate } from "./content-fs";
import { buildResumeLatex } from "@/app/lib/content/render";
import { getFilteredAndSortedContent, selectJobDuties, DUTY_FLOOR } from "@/app/lib/content/load";
import { Dimension, scoreContentCosine } from "@/app/lib/content/scoring";
import { ContentTypeEnum, Job } from "@/app/lib/content/schema";

const VALID_DIMS = new Set<string>(Dimension.options);
const RESUME_LINE_BUDGET = 14;
const CONTACT = { email: "you@example.com", phone: "+1 (555) 555-5555" };

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "content");

// recursively collect every `scores` object found in a parsed YAML tree
function collectScoresKeys(node: unknown, keys: Set<string>): void {
    if (Array.isArray(node)) {
        node.forEach((n) => collectScoresKeys(n, keys));
    } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            if (k === "scores" && v && typeof v === "object" && !Array.isArray(v)) {
                Object.keys(v as object).forEach((dim) => keys.add(dim));
            }
            collectScoresKeys(v, keys);
        }
    }
}

describe("content invariants (independent of specific scores)", () => {
    const allContent = loadAllContent();
    const profiles = loadProfiles();
    const template = getResumeTemplate();
    const jobs = allContent.filter((c): c is Job => c.contentType === ContentTypeEnum.enum.job);

    it("content and profiles load and are non-empty", () => {
        expect(allContent.length).toBeGreaterThan(0);
        expect(profiles.length).toBeGreaterThan(0);
        expect(jobs.length).toBeGreaterThan(0);
    });

    it("every score key in every YAML is a real dimension (catches typos Zod silently drops)", () => {
        const found = new Set<string>();
        const walk = (dir: string) => {
            for (const e of readdirSync(dir, { withFileTypes: true })) {
                const p = join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (/\.(ya?ml)$/.test(e.name)) collectScoresKeys(parseYaml(readFileSync(p, "utf8")), found);
            }
        };
        walk(CONTENT_DIR);
        const unknown = [...found].filter((d) => !VALID_DIMS.has(d));
        expect(unknown, `unknown dimension key(s) in content scores: ${unknown.join(", ")}`).toEqual([]);
    });

    it("every profile renders to non-empty LaTeX without throwing", () => {
        for (const p of profiles) {
            const latex = buildResumeLatex({ allContent, template, weights: p.scores, contact: CONTACT });
            expect(latex.length, p.name).toBeGreaterThan(0);
        }
    });

    it("no job ever renders bare — each keeps min(DUTY_FLOOR, its duty count) duties", () => {
        for (const p of profiles) {
            const selected = getFilteredAndSortedContent(allContent, p.scores, RESUME_LINE_BUDGET) as Job[];
            for (const job of selected.filter((c) => c.contentType === ContentTypeEnum.enum.job)) {
                const original = jobs.find((j) => j.company === job.company)!;
                expect(job.duties.length, `${p.name} / ${job.company}`).toBeGreaterThanOrEqual(
                    Math.min(DUTY_FLOOR, original.duties.length)
                );
            }
        }
    });

    it("duty line usage stays within budget (floor here is below budget, so it must)", () => {
        for (const p of profiles) {
            const { trace } = selectJobDuties(jobs, p.scores, RESUME_LINE_BUDGET);
            expect(trace.linesUsed, p.name).toBeLessThanOrEqual(RESUME_LINE_BUDGET);
        }
    });

    it("cosine stays in [0,1] for all content under every profile (non-negative scores)", () => {
        for (const p of profiles) {
            for (const c of allContent) {
                const s = scoreContentCosine(p.scores, c.scores);
                expect(s, `${p.name} / ${c.title}`).toBeGreaterThanOrEqual(0);
                expect(s).toBeLessThanOrEqual(1);
            }
        }
    });
});
