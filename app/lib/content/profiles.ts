// profiles.ts
//
// Pure schema + parsing for resume profiles. No build-time I/O lives here, so this is
// safe to import from anywhere (site or tests). The webpack-loaded `profiles` value is
// produced in content-io.ts via parseProfiles(); the fs-based test adapter calls the
// same parseProfiles() on YAML it read itself.
import { z } from "zod/v4";
import {Dimension, DimensionScores, dimensionScoresSchema, maxScore} from "@/app/lib/content/scoring";

// Special profile name for custom weight combinations
export const CUSTOM_PROFILE_NAME = "Utility Player";

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

export function parseProfiles(raw: unknown): Profile[] {
    return profilesSchema.parse(raw);
}
