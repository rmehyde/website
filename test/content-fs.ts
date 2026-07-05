// fs-based content adapter — the node counterpart to app/lib/content/content-io.ts.
//   content-io uses webpack's require.context / asset imports; this uses fs + the `yaml`
//   package. Both funnel through the SAME parseContentEntries / parseProfiles so the
//   validation and selection LOGIC stays single-source; only the I/O differs.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { parseContentEntries } from "@/app/lib/content/load";
import { parseProfiles, Profile } from "@/app/lib/content/profiles";
import { Content } from "@/app/lib/content/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content");
const TEMPLATE_PATH = join(ROOT, "app", "templates", "resume.tex.mustache");
const PROFILES_PATH = join(CONTENT_DIR, "profiles.yaml");

// load all content YAML (excluding the root profiles.yaml), matching content-io's glob:
//   /\.\/.+\/.+\.(?:ya?ml)$/  — i.e. files nested at least one directory deep.
export function loadAllContent(): Content[] {
    const out: Content[] = [];
    const walk = (dir: string, depth: number) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const p = join(dir, entry.name);
            if (entry.isDirectory()) walk(p, depth + 1);
            else if (depth >= 1 && /\.(ya?ml)$/.test(entry.name)) {
                out.push(...parseContentEntries(parseYaml(readFileSync(p, "utf8"))));
            }
        }
    };
    walk(CONTENT_DIR, 0);
    return out;
}

export function loadProfiles(): Profile[] {
    return parseProfiles(parseYaml(readFileSync(PROFILES_PATH, "utf8")));
}

export function getResumeTemplate(): string {
    return readFileSync(TEMPLATE_PATH, "utf8");
}
