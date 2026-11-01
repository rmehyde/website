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

// 1 = dabbled, 2 = solid, 3 = expert
const senioritySchema = z.literal([1, 2, 3]);
export type Seniority = z.infer<typeof senioritySchema>;

// yaml entries can omit `scores` for now
const profileSchema = z.object({
    name: z.string().min(1),
    seniority: senioritySchema,
    scores: dimensionScoresSchema.optional().transform((s) => s ?? maxedScores),
});

export const profilesSchema = z.array(profileSchema);
export type Profile = z.infer<typeof profileSchema>;
// Selector entry: the custom profile isn't in the yaml and has no seniority.
export type ProfileOption = Omit<Profile, "seniority"> & { seniority?: Seniority };

export function parseProfiles(raw: unknown): Profile[] {
    return profilesSchema.parse(raw);
}
