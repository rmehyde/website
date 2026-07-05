// content-io.ts
//
// THE ONLY webpack-coupled module in the content pipeline. It owns the build-time
// I/O (require.context globs + the mustache asset import) and hands plain data to the
// pure core (load.ts / render.ts / profiles.ts). Tests use an fs-based adapter instead,
// so the selection/render LOGIC stays single-source while only the I/O differs.
//
// Do not import this from anything that needs to run outside webpack (e.g. unit tests).

import {Content} from "@/app/lib/content/schema";
import {parseContentEntries} from "@/app/lib/content/load";
import {parseProfiles, Profile} from "@/app/lib/content/profiles";
import resumeTemplate from "@/app/templates/resume.tex.mustache";

// load all .yaml/.yml content files (excluding the root profiles.yaml) as validated Content
export function loadAllContent(): Content[] {
    const contentModules = (require as any).context(
        '@/content',
        true,
        /\.\/.+\/.+\.(?:ya?ml)$/
    )
    return contentModules
        .keys()
        .flatMap((key: string): Content[] => parseContentEntries(contentModules(key)))
}

// the resume LaTeX template, imported by webpack as a raw string
export function getResumeTemplate(): string {
    return resumeTemplate
}

// load exactly /content/profiles.yaml (or .yml)
function loadRawProfiles(): unknown {
    const profilesModule = (require as any).context(
        "@/content",
        false,
        /^\.\/profiles\.ya?ml$/
    )
    const raw = profilesModule("./profiles.yaml")
    return (raw.default ?? raw) as unknown
}

export const profiles: Profile[] = parseProfiles(loadRawProfiles())
