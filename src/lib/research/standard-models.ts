import { z } from "zod";

/**
 * Provider-agnostic "standard models" for the Audience Research Intelligence
 * Engine - the contract every research provider normalizes to (OpenBB-style).
 *
 * Zod schemas are the source of truth; inferred types are exported alongside.
 * Every research-derived item carries `sources` (citations) so the UI and the
 * Operator can attribute claims to real data.
 */

/* -------------------------------------------------------------------------- */
/* Platforms                                                                  */
/* -------------------------------------------------------------------------- */

/** Paid media platforms MediaOS can generate creatives + report for. */
export const AD_PLATFORMS = ["google", "meta", "tiktok", "taboola", "linkedin", "youtube", "x"] as const;
export const adPlatformSchema = z.enum(AD_PLATFORMS);
export type AdPlatform = z.infer<typeof adPlatformSchema>;

/** Any surface a research source may come from (superset of ad platforms). */
export const SOURCE_PLATFORMS = [
  "google",
  "meta",
  "tiktok",
  "taboola",
  "linkedin",
  "youtube",
  "x",
  "reddit",
  "news",
  "web",
  "quora",
  "other",
] as const;
export const sourcePlatformSchema = z.enum(SOURCE_PLATFORMS);
export type SourcePlatform = z.infer<typeof sourcePlatformSchema>;

/* -------------------------------------------------------------------------- */
/* Citations                                                                  */
/* -------------------------------------------------------------------------- */

export const sourceCitationSchema = z.object({
  provider: z.string(),
  url: z.url().optional(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  /** ISO timestamp of when the source was fetched. */
  fetchedAt: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type SourceCitation = z.infer<typeof sourceCitationSchema>;

/* -------------------------------------------------------------------------- */
/* Core standard models                                                       */
/* -------------------------------------------------------------------------- */

export const painPointSchema = z.object({
  summary: z.string(),
  /** The audience's own words, where available. */
  quote: z.string().optional(),
  intensity: z.number().min(0).max(1).optional(),
  frequency: z.number().min(0).max(1).optional(),
  sources: z.array(sourceCitationSchema).default([]),
});
export type PainPoint = z.infer<typeof painPointSchema>;

export const buyingTriggerSchema = z.object({
  trigger: z.string(),
  context: z.string().optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  sources: z.array(sourceCitationSchema).default([]),
});
export type BuyingTrigger = z.infer<typeof buyingTriggerSchema>;

export const audienceSegmentSchema = z.object({
  name: z.string(),
  demographics: z
    .object({
      ageRange: z.string().optional(),
      genderSplit: z.string().optional(),
      incomeBracket: z.string().optional(),
      education: z.string().optional(),
      location: z.string().optional(),
    })
    .default({}),
  psychographics: z
    .object({
      values: z.array(z.string()).default([]),
      interests: z.array(z.string()).default([]),
      painPoints: z.array(z.string()).default([]),
      aspirations: z.array(z.string()).default([]),
    })
    .default({ values: [], interests: [], painPoints: [], aspirations: [] }),
  behaviors: z
    .object({
      platforms: z.array(z.string()).default([]),
      contentConsumption: z.array(z.string()).default([]),
      purchasePatterns: z.array(z.string()).default([]),
    })
    .default({ platforms: [], contentConsumption: [], purchasePatterns: [] }),
  sizeEstimate: z
    .object({
      range: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .default({}),
  sources: z.array(sourceCitationSchema).default([]),
});
export type AudienceSegment = z.infer<typeof audienceSegmentSchema>;

export const competitorAdSchema = z.object({
  platform: z.string(),
  advertiser: z.string().optional(),
  creativeType: z.string().optional(),
  copy: z.string().optional(),
  hooksUsed: z.array(z.string()).default([]),
  estimatedSpend: z.string().optional(),
  dateRange: z.string().optional(),
  engagementSignals: z.record(z.string(), z.number()).optional(),
  imageUrl: z.url().optional(),
  sources: z.array(sourceCitationSchema).default([]),
});
export type CompetitorAd = z.infer<typeof competitorAdSchema>;

export const trendPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});
export type TrendPoint = z.infer<typeof trendPointSchema>;

export const trendSignalSchema = z.object({
  topic: z.string(),
  velocity: z.number().optional(),
  volume: z.number().optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  source: z.string().optional(),
  timeSeries: z.array(trendPointSchema).default([]),
  sources: z.array(sourceCitationSchema).default([]),
});
export type TrendSignal = z.infer<typeof trendSignalSchema>;

export const communityInsightSchema = z.object({
  sourceUrl: z.url().optional(),
  platform: z.string().optional(),
  content: z.string(),
  painPointExtracted: z.string().optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  upvotes: z.number().int().optional(),
  postedAt: z.string().optional(),
  sources: z.array(sourceCitationSchema).default([]),
});
export type CommunityInsight = z.infer<typeof communityInsightSchema>;

/* -------------------------------------------------------------------------- */
/* Query params (provider-agnostic input)                                     */
/* -------------------------------------------------------------------------- */

export const queryParamsSchema = z.object({
  /** Free-text audience / topic to research. */
  query: z.string().min(1),
  industry: z.string().optional(),
  product: z.string().optional(),
  audienceHint: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});
export type QueryParams = z.infer<typeof queryParamsSchema>;

/* -------------------------------------------------------------------------- */
/* Tagged standard model (what providers emit)                                */
/* -------------------------------------------------------------------------- */

export const standardModelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("audience_segment"), data: audienceSegmentSchema }),
  z.object({ kind: z.literal("competitor_ad"), data: competitorAdSchema }),
  z.object({ kind: z.literal("trend_signal"), data: trendSignalSchema }),
  z.object({ kind: z.literal("community_insight"), data: communityInsightSchema }),
  z.object({ kind: z.literal("pain_point"), data: painPointSchema }),
  z.object({ kind: z.literal("buying_trigger"), data: buyingTriggerSchema }),
]);
export type StandardModel = z.infer<typeof standardModelSchema>;
export type StandardModelKind = StandardModel["kind"];

/* -------------------------------------------------------------------------- */
/* Opportunities (AI-detected, citation-backed)                               */
/* -------------------------------------------------------------------------- */

/**
 * High-leverage openings the analyzer surfaces from the merged data:
 * - `high_pain_low_competition`: strong, repeated pain with few competitors addressing it.
 * - `pre_saturation_trend`: a rising topic before the market crowds in.
 * - `messaging_gap`: angle/voice the audience wants but competitors are not using.
 * - `audience_expansion`: an adjacent segment the same product can credibly serve.
 */
export const OPPORTUNITY_TYPES = [
  "high_pain_low_competition",
  "pre_saturation_trend",
  "messaging_gap",
  "audience_expansion",
] as const;
export const opportunityTypeSchema = z.enum(OPPORTUNITY_TYPES);
export type OpportunityType = z.infer<typeof opportunityTypeSchema>;

export const opportunitySchema = z.object({
  title: z.string(),
  rationale: z.string(),
  type: opportunityTypeSchema,
  confidence: z.number().min(0).max(1).optional(),
  sources: z.array(sourceCitationSchema).default([]),
});
export type Opportunity = z.infer<typeof opportunitySchema>;

/* -------------------------------------------------------------------------- */
/* Provider + aggregated results                                              */
/* -------------------------------------------------------------------------- */

export type ProviderRunStatus = "success" | "partial" | "failed" | "skipped";

/** What a single provider returns from a run. */
export interface ProviderResult {
  provider: string;
  items: StandardModel[];
  sources: SourceCitation[];
  status: ProviderRunStatus;
  error?: string;
  durationMs?: number;
}

export const providerRunSummarySchema = z.object({
  provider: z.string(),
  status: z.enum(["success", "partial", "failed", "skipped"]),
  itemCount: z.number().int().default(0),
  error: z.string().optional(),
  durationMs: z.number().optional(),
});
export type ProviderRunSummary = z.infer<typeof providerRunSummarySchema>;

/** Merged, citation-rich output of an orchestrated research run. */
export const researchResultSchema = z.object({
  query: queryParamsSchema,
  segments: z.array(audienceSegmentSchema).default([]),
  competitorAds: z.array(competitorAdSchema).default([]),
  trends: z.array(trendSignalSchema).default([]),
  communityInsights: z.array(communityInsightSchema).default([]),
  painPoints: z.array(painPointSchema).default([]),
  buyingTriggers: z.array(buyingTriggerSchema).default([]),
  sources: z.array(sourceCitationSchema).default([]),
  providerRuns: z.array(providerRunSummarySchema).default([]),
  generatedAt: z.string().optional(),
});
export type ResearchResult = z.infer<typeof researchResultSchema>;

/**
 * The full research deliverable: the merged provider `ResearchResult` enriched by
 * the AI analyzer with synthesized personas (in `segments`) and detected
 * `opportunities`. This is what the workspace renders and the orchestrator
 * persists.
 */
export const researchReportSchema = researchResultSchema.extend({
  opportunities: z.array(opportunitySchema).default([]),
});
export type ResearchReport = z.infer<typeof researchReportSchema>;
