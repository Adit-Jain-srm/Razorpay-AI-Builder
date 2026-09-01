import { z } from "zod";

import { adPlatformSchema } from "@/lib/research/standard-models";

/**
 * Creative Studio domain types - the contract shared by the generators, the
 * persistence layer, the export formatters, and the UI.
 *
 * Zod schemas are the source of truth: AI output is parsed/validated before it is
 * trusted, and DB `content` jsonb is re-validated on read. Inferred types are
 * exported alongside. Everything here is PURE and client-safe (no server-only
 * imports) so the studio UI can compute character counts and render analysis
 * without pulling Azure/Supabase into the client bundle.
 */

/* -------------------------------------------------------------------------- */
/* Hook psychology                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The persuasion mechanism a hook leans on. Direct-response copy almost always
 * pulls one of these psychological levers; classifying it lets us badge variants
 * and balance an A/B set across mechanisms.
 */
export const HOOK_TYPES = ["fear", "curiosity", "fomo", "social_proof", "urgency", "exclusivity"] as const;
export const hookTypeSchema = z.enum(HOOK_TYPES);
export type HookType = z.infer<typeof hookTypeSchema>;

export const HOOK_LABELS: Record<HookType, string> = {
  fear: "Fear",
  curiosity: "Curiosity",
  fomo: "FOMO",
  social_proof: "Social proof",
  urgency: "Urgency",
  exclusivity: "Exclusivity",
};

export const hookAnalysisSchema = z.object({
  type: hookTypeSchema,
  /** 0-1 confidence in the primary classification. */
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
  /** Per-mechanism signal strength (0-1), so the UI can show a secondary hook. */
  scores: z.record(z.string(), z.number()).default({}),
});
export type HookAnalysis = z.infer<typeof hookAnalysisSchema>;

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export const scoreBreakdownSchema = z.object({
  /** Reads cleanly, fits the platform, not overstuffed. */
  clarity: z.number().min(0).max(100),
  /** Concrete numbers, names, and proof rather than vague claims. */
  specificity: z.number().min(0).max(100),
  /** Presence and strength of an action-oriented call to action. */
  ctaStrength: z.number().min(0).max(100),
  /** Opening hook strength (mechanism present + confident). */
  hookStrength: z.number().min(0).max(100),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const scoreAnalysisSchema = z.object({
  /** Weighted 0-100 overall direct-response score. */
  total: z.number().min(0).max(100),
  breakdown: scoreBreakdownSchema,
  notes: z.array(z.string()).default([]),
});
export type ScoreAnalysis = z.infer<typeof scoreAnalysisSchema>;

/* -------------------------------------------------------------------------- */
/* Fields + content                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A single platform copy element after limit enforcement. Storing the limit and
 * flags makes the field self-describing so the UI renders character counters and
 * over-limit warnings without re-deriving the platform spec.
 */
export const creativeFieldSchema = z.object({
  /** Stable role, e.g. "headline" | "description" | "primary_text" | "hook" | "caption" | "overlay" | "cta" | "path" | "branding". */
  role: z.string(),
  /** Human label, e.g. "Headline 1". */
  label: z.string(),
  text: z.string(),
  limit: z.number().int().positive(),
  length: z.number().int().nonnegative(),
  withinLimit: z.boolean(),
  /** True when the original model output exceeded the limit and we trimmed it. */
  truncated: z.boolean(),
});
export type CreativeField = z.infer<typeof creativeFieldSchema>;

export const creativeFormatSchema = z.enum(["rsa", "single", "video", "native", "generic"]);
export type CreativeFormat = z.infer<typeof creativeFormatSchema>;

/**
 * The full, validated body of a creative variant. Persisted verbatim to
 * `creatives.content` (jsonb) and mirrored into the row's `hook_type`,
 * `hook_confidence`, and `score` columns for querying.
 */
export const creativeContentSchema = z.object({
  platform: adPlatformSchema,
  format: creativeFormatSchema,
  /** Denormalized primary headline (for cards, lists, and exports). */
  headline: z.string(),
  /** Denormalized primary body (for cards, lists, and exports). */
  body: z.string(),
  fields: z.array(creativeFieldSchema),
  hook: hookAnalysisSchema,
  score: scoreAnalysisSchema,
  /** The angle/positioning this variant tests (drives A/B grouping). */
  angle: z.string().optional(),
  /** Research pain points this variant was asked to target. */
  painPointsTargeted: z.array(z.string()).default([]),
  /** Generation batch id - variants sharing it form one A/B set. */
  batchId: z.string().optional(),
  /** Quality flags surfaced in the UI, e.g. "truncated", "over_limit". */
  flags: z.array(z.string()).default([]),
});
export type CreativeContent = z.infer<typeof creativeContentSchema>;

/**
 * An in-flight generated variant before persistence. The service turns this into
 * a `creatives` row by adding ids + campaign/user scoping.
 */
export interface GeneratedVariant {
  content: CreativeContent;
}

/** Safe-parse `content` jsonb from the DB back into a typed `CreativeContent`. */
export function parseCreativeContent(value: unknown): CreativeContent | null {
  const parsed = creativeContentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
