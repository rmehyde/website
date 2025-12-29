// profiles.ts
import { z } from "zod/v4";
import {Dimension, DimensionScores, dimensionScoresSchema, maxScore} from "@/app/lib/content/scoring";


// load exactly /public/content/profiles.yaml (or .yml)
const profilesModule = (require as any).context(
    "@/public/content",
    false,
    /^\.\/profiles\.ya?ml$/
);

const raw = profilesModule("./profiles.yaml");
const rawProfiles = (raw.default ?? raw) as unknown;

// default: max score across all dims
const maxedScores: DimensionScores = dimensionScoresSchema.parse(
    Object.fromEntries(Dimension.options.map((d) => [d, maxScore]))
);

// yaml entries can omit `scores` for now
const profileSchema = z.object({
    name: z.string().min(1),
    scores: dimensionScoresSchema.optional().transform((s) => s ?? maxedScores),
});

export const profilesSchema = z.array(profileSchema);
export type Profile = z.infer<typeof profileSchema>;

export const profiles = profilesSchema.parse(rawProfiles);
