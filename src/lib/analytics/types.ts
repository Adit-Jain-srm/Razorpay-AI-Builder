import type { AdPlatform } from "@/lib/research/standard-models";

/**
 * Analytics domain types - the shared vocabulary for the Performance Intelligence
 * module. Everything here is PURE data (no DB/network/env) so it is safe to import
 * from both server code and Client Components (Recharts panels included).
 *
 * The persisted shapes live in `@/types/database` (`performance_metrics`,
 * `anomalies`, `ai_insights`). These types are the computed/derived view models
 * the dashboard, anomaly detector, recommender, and AI brief all speak.
 */

/** The four primary buying channels the seeder + dashboard model. */
export const ANALYTICS_PLATFORMS = ["google", "meta", "tiktok", "taboola"] as const satisfies readonly AdPlatform[];

/** Metric keys that can be charted / aggregated. */
export const METRIC_KEYS = [
  "impressions",
  "clicks",
  "conversions",
  "spend",
  "revenue",
  "cpa",
  "ctr",
  "cvr",
  "roas",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

/** Whether a metric is "better" when it goes up or down (drives delta coloring). */
export const METRIC_DIRECTION: Record<MetricKey, "up" | "down"> = {
  impressions: "up",
  clicks: "up",
  conversions: "up",
  spend: "up",
  revenue: "up",
  cpa: "down",
  ctr: "up",
  cvr: "up",
  roas: "up",
};

/** A single point in a time series (ISO `YYYY-MM-DD` date + numeric value). */
export interface SeriesPoint {
  date: string;
  value: number;
}

/**
 * Roll-up across a set of metric rows. Ratios (`ctr`/`cvr`/`cpa`/`roas`) are
 * recomputed from the summed totals - never averaged from per-row ratios.
 */
export interface MetricSummary {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

/** Per-platform roll-up plus its share of total spend. */
export interface PlatformSummary extends MetricSummary {
  platform: string;
  spendShare: number;
}

/** Per-creative roll-up used for the creative-performance correlation. */
export interface CreativePerformance extends MetricSummary {
  creativeId: string;
  label: string;
  platform: string;
}

/** Lightweight creative descriptor the UI + recommender resolve labels from. */
export interface CreativeMeta {
  id: string;
  label: string;
  platform: string;
}

/** Current-vs-previous comparison for a metric (percentage change). */
export interface MetricDelta {
  current: number;
  previous: number;
  /** Signed percentage change (current vs previous). `null` when undefined. */
  changePct: number | null;
}

/** Period-over-period deltas for the headline metric cards. */
export type SummaryDeltas = Record<MetricKey, MetricDelta>;

/* -------------------------------------------------------------------------- */
/* Funnel                                                                     */
/* -------------------------------------------------------------------------- */

export const FUNNEL_STAGES = ["Impressions", "Clicks", "LP Views", "Leads", "Conversions"] as const;
export type FunnelStageName = (typeof FUNNEL_STAGES)[number];

export interface FunnelStage {
  stage: FunnelStageName;
  value: number;
  /** Conversion rate from the previous stage (0-1). `null` for the first stage. */
  stepRate: number | null;
  /** Conversion rate from the top of the funnel (0-1). */
  overallRate: number;
}

/* -------------------------------------------------------------------------- */
/* Anomalies                                                                  */
/* -------------------------------------------------------------------------- */

export const ANOMALY_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number];

/** Metrics the detector monitors, with the direction that is "bad". */
export const ANOMALY_METRICS = ["cpa", "ctr", "spend"] as const;
export type AnomalyMetric = (typeof ANOMALY_METRICS)[number];

/**
 * A detected anomaly in a metric time series. Maps cleanly onto the `anomalies`
 * table via `toAnomalyInserts` (adding `user_id` happens at the store boundary).
 */
export interface AnomalyFinding {
  /** The monitored metric (`cpa`, `ctr`, `spend`). */
  metric: AnomalyMetric;
  /** Scope of the series, e.g. `"meta"` or `"all"` (cross-platform). */
  platform: string;
  severity: AnomalySeverity;
  /** Human-readable explanation, used as the row `description`. */
  description: string;
  /** ISO datetime the anomalous point occurred (the row `detected_at`). */
  detectedAt: string;
  /** Signed z-score of the anomalous point. */
  zScore: number;
  /** The anomalous observed value. */
  value: number;
  /** The series baseline (mean) the value deviated from. */
  baseline: number;
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                            */
/* -------------------------------------------------------------------------- */

export const RECOMMENDATION_TYPES = ["scale", "pause", "refresh", "reallocate", "investigate"] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const RECOMMENDATION_PRIORITIES = ["high", "medium", "low"] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

/**
 * An actionable recommendation tied to a real campaign/creative/platform. The
 * Operator's improvement loop consumes these; the dashboard renders them.
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  /** One-line imperative title, e.g. "Scale Creative A on Meta". */
  title: string;
  /** Supporting evidence, e.g. "42% lower CPA than the campaign average". */
  rationale: string;
  campaignId: string;
  creativeId: string | null;
  platform: string | null;
  /** Optional headline metric for the chip, e.g. "-42% CPA". */
  metricLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* AI daily brief                                                             */
/* -------------------------------------------------------------------------- */

export interface DailyBriefResult {
  /** Markdown-ish natural-language brief (renders as plain paragraphs). */
  content: string;
  /** Where the brief came from - drives the "AI" vs "auto" affordance. */
  source: "ai" | "templated";
  /** 0-1 confidence in the brief. */
  confidence: number;
  generatedAt: string;
}
