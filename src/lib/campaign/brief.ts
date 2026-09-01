import { z } from "zod";

import { AD_PLATFORMS, adPlatformSchema, type AdPlatform } from "@/lib/research/standard-models";
import type { CampaignRow } from "@/types/database";

/**
 * Campaign domain model - the typed contract that sits on top of the `campaigns`
 * table's four jsonb columns. The DB types everything as `Json`; this module is
 * the single place that decodes those columns into rich, validated shapes and
 * encodes them back. Zod schemas are the source of truth (lenient on read so a
 * legacy/partial row never crashes the UI), inferred types exported alongside.
 *
 * Column mapping:
 * - `brief`           -> {@link CampaignBriefData}     (objective, offer, personas, ...)
 * - `platform_config` -> {@link PlatformConfig}        (selected platforms + AI recs)
 * - `budget`          -> {@link BudgetPlan}            (total/daily + per-platform split)
 * - `persona_ids`     -> `string[]`                    (ids mirrored from brief.personas)
 *
 * Pure: no DB / network / env access, so it is trivially unit-testable and safe
 * to import from both server and client components.
 */

/* -------------------------------------------------------------------------- */
/* Status + objective                                                         */
/* -------------------------------------------------------------------------- */

export const CAMPAIGN_STATUSES = ["draft", "active", "archived"] as const;
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

/** Coerce any DB string into a known status (defaults to `draft`). */
export function coerceStatus(value: string | null | undefined): CampaignStatus {
  return value === "active" || value === "archived" ? value : "draft";
}

/** Direct-response objective presets surfaced in the builder (free-text allowed). */
export const CAMPAIGN_OBJECTIVES = [
  "leads",
  "sales",
  "traffic",
  "awareness",
  "engagement",
  "app_installs",
] as const;
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

/** Where a piece of the brief came from - drives "AI-assisted" UI affordances. */
export const GENERATION_SOURCES = ["manual", "ai", "seeded", "template"] as const;
export const generationSourceSchema = z.enum(GENERATION_SOURCES);
export type GenerationSource = z.infer<typeof generationSourceSchema>;

/* -------------------------------------------------------------------------- */
/* Personas (snapshot stored in the brief)                                    */
/* -------------------------------------------------------------------------- */

export const personaSourceSchema = z.enum(["research", "ai", "manual"]);
export type PersonaSource = z.infer<typeof personaSourceSchema>;

/**
 * A lightweight, self-contained snapshot of an audience persona stored on the
 * campaign brief. Snapshotting (rather than only referencing) means the campaign
 * hub renders the audience even if the source research project is later changed
 * or deleted - the brief is the durable record of what the campaign was built on.
 */
export const personaSnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().default(""),
  ageRange: z.string().optional(),
  incomeBracket: z.string().optional(),
  location: z.string().optional(),
  painPoints: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
  sizeRange: z.string().optional(),
  source: personaSourceSchema.default("manual"),
  /** The research project this persona was imported from, when applicable. */
  researchProjectId: z.string().optional(),
});
export type PersonaSnapshot = z.infer<typeof personaSnapshotSchema>;

/* -------------------------------------------------------------------------- */
/* Platform recommendation + selection                                        */
/* -------------------------------------------------------------------------- */

export const platformRecommendationSchema = z.object({
  platform: adPlatformSchema,
  /** 0-100 suitability score for this offer/audience. */
  fit: z.number().min(0).max(100),
  rationale: z.string().default(""),
});
export type PlatformRecommendation = z.infer<typeof platformRecommendationSchema>;

export const platformConfigSchema = z.object({
  /** Platforms the campaign will actually run on. */
  platforms: z.array(adPlatformSchema).default([]),
  /** Ranked AI/seeded recommendations (kept even when not all are selected). */
  recommendations: z.array(platformRecommendationSchema).default([]),
  source: generationSourceSchema.default("manual"),
  generatedAt: z.string().optional(),
});
export type PlatformConfig = z.infer<typeof platformConfigSchema>;

/* -------------------------------------------------------------------------- */
/* Budget plan                                                                */
/* -------------------------------------------------------------------------- */

export const budgetAllocationSchema = z.object({
  platform: adPlatformSchema,
  /** Share of total spend, 0-100. Allocations across platforms should sum ~100. */
  percent: z.number().min(0).max(100),
  rationale: z.string().default(""),
});
export type BudgetAllocation = z.infer<typeof budgetAllocationSchema>;

export const budgetPlanSchema = z.object({
  total: z.number().nonnegative().optional(),
  daily: z.number().nonnegative().optional(),
  currency: z.string().default("USD"),
  allocations: z.array(budgetAllocationSchema).default([]),
  source: generationSourceSchema.default("manual"),
  generatedAt: z.string().optional(),
});
export type BudgetPlan = z.infer<typeof budgetPlanSchema>;

/* -------------------------------------------------------------------------- */
/* AI brief-assistant result shapes (pure, so the client can consume them)    */
/* -------------------------------------------------------------------------- */

export interface BudgetSuggestion {
  total?: number;
  currency: string;
  allocations: BudgetAllocation[];
  source: "ai" | "seeded";
}

/** The full output of the AI brief assistant (a starting brief draft). */
export interface BriefAssistResult {
  objective: string;
  valueProps: string[];
  tone: string;
  personas: PersonaSnapshot[];
  platforms: PlatformRecommendation[];
  budget: BudgetSuggestion;
  source: "ai" | "seeded";
}

/* -------------------------------------------------------------------------- */
/* Brief                                                                      */
/* -------------------------------------------------------------------------- */

export const briefSchema = z.object({
  objective: z.string().default(""),
  product: z.string().default(""),
  offer: z.string().default(""),
  audience: z.string().default(""),
  valueProps: z.array(z.string()).default([]),
  tone: z.string().default(""),
  notes: z.string().default(""),
  personas: z.array(personaSnapshotSchema).default([]),
  /** Source research project (the "research first" linkage). */
  researchProjectId: z.string().optional(),
  source: generationSourceSchema.default("manual"),
});
export type CampaignBriefData = z.infer<typeof briefSchema>;

/* -------------------------------------------------------------------------- */
/* Decoded campaign view                                                      */
/* -------------------------------------------------------------------------- */

/** The fully decoded, validated campaign the UI renders. */
export interface CampaignView {
  id: string;
  name: string;
  status: CampaignStatus;
  brief: CampaignBriefData;
  platformConfig: PlatformConfig;
  budget: BudgetPlan;
  personaIds: string[];
  createdAt: string;
  updatedAt: string;
}

const stringArraySchema = z.array(z.string());

/** Parse a jsonb value with a schema, falling back to the schema's defaults. */
export function decodeBrief(value: unknown): CampaignBriefData {
  const parsed = briefSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : briefSchema.parse({});
}

export function decodePlatformConfig(value: unknown): PlatformConfig {
  const parsed = platformConfigSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : platformConfigSchema.parse({});
}

export function decodeBudget(value: unknown): BudgetPlan {
  const parsed = budgetPlanSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : budgetPlanSchema.parse({});
}

export function decodePersonaIds(value: unknown): string[] {
  const parsed = stringArraySchema.safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
}

/** Decode a raw `campaigns` row into the rich, validated view model. */
export function decodeCampaign(row: CampaignRow): CampaignView {
  return {
    id: row.id,
    name: row.name,
    status: coerceStatus(row.status),
    brief: decodeBrief(row.brief),
    platformConfig: decodePlatformConfig(row.platform_config),
    budget: decodeBudget(row.budget),
    personaIds: decodePersonaIds(row.persona_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

const PLATFORM_LABELS: Record<AdPlatform, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  taboola: "Taboola",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
};

/** Human label for an ad platform (falls back to a title-cased key). */
export function platformLabel(platform: string): string {
  if ((AD_PLATFORMS as readonly string[]).includes(platform)) {
    return PLATFORM_LABELS[platform as AdPlatform];
  }
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** Persona ids derived from a brief's snapshots (kept in sync with `persona_ids`). */
export function personaIdsFromBrief(brief: CampaignBriefData): string[] {
  return brief.personas.map((persona) => persona.id);
}

/** Currency-formatted spend; integer-rounded so metric columns stay tidy. */
export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

/** The spend implied by an allocation's percent against the plan's total. */
export function allocationAmount(allocation: BudgetAllocation, total: number | undefined): number | null {
  if (typeof total !== "number" || total <= 0) return null;
  return Math.round((allocation.percent / 100) * total);
}

/** Sum of allocation percents (used to validate/normalize a budget split). */
export function totalAllocationPercent(allocations: BudgetAllocation[]): number {
  return allocations.reduce((sum, allocation) => sum + allocation.percent, 0);
}

/**
 * Rebalance allocation percents to sum to exactly 100, preserving relative
 * weights. Empty input returns empty; an all-zero input splits evenly. Any
 * rounding remainder is folded into the largest allocation so the total is exact.
 */
export function normalizeAllocations(allocations: BudgetAllocation[]): BudgetAllocation[] {
  if (allocations.length === 0) return [];
  const sum = totalAllocationPercent(allocations);
  const weights =
    sum > 0 ? allocations.map((a) => a.percent / sum) : allocations.map(() => 1 / allocations.length);

  const scaled = allocations.map((allocation, i) => ({
    ...allocation,
    percent: Math.round(weights[i] * 100),
  }));

  const drift = 100 - totalAllocationPercent(scaled);
  if (drift !== 0) {
    let largest = 0;
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i].percent > scaled[largest].percent) largest = i;
    }
    scaled[largest] = { ...scaled[largest], percent: Math.max(0, scaled[largest].percent + drift) };
  }
  return scaled;
}

/**
 * A 0-100 completeness score for the brief, used to nudge users toward a richer
 * setup. Weighted toward the fields that make downstream generation good.
 */
export function briefCompleteness(view: CampaignView): number {
  const checks: Array<[boolean, number]> = [
    [view.brief.objective.trim().length > 0, 15],
    [view.brief.product.trim().length > 0, 15],
    [view.brief.offer.trim().length > 0, 10],
    [view.brief.valueProps.length > 0, 15],
    [view.brief.personas.length > 0, 20],
    [view.platformConfig.platforms.length > 0, 15],
    [(view.budget.total ?? 0) > 0, 10],
  ];
  const score = checks.reduce((sum, [ok, weight]) => sum + (ok ? weight : 0), 0);
  return Math.min(100, score);
}
