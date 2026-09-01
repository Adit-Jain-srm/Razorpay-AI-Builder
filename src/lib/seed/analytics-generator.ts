import type { AdPlatform } from "@/lib/research/standard-models";
import type { PerformanceMetricInsert } from "@/types/database";

import { makeRng } from "./rng";

/**
 * Deterministic, realistic performance-metric generator. Given a campaign + its
 * creatives, it synthesizes daily rows across platforms for `days` days ending at
 * `endDate`, modeling:
 *   - per-PLATFORM baselines (impressions / CTR / CVR / CPC / revenue-per-conv)
 *   - per-CREATIVE quality multipliers (so some creatives clearly out/under-perform)
 *   - CREATIVE FATIGUE: CTR decays with creative age (exp. decay to a floor)
 *   - LAUNCH RAMP + staggered launches (fresh creatives start later)
 *   - WEEKLY SEASONALITY (weekends softer for a finance audience) + mild growth trend
 *   - seeded GAUSSIAN noise (reproducible via the string-seeded RNG)
 *   - INJECTED anomalies (CPA spike, CTR drop, spend surge) for the detector to catch
 *
 * PURE + deterministic: same (target, options) → identical rows. The store layer
 * adds `user_id`; tests consume the raw `MetricSeed[]`.
 */

/** A metric row minus the RLS-owned `user_id` (added at the store boundary). */
export type MetricSeed = Omit<PerformanceMetricInsert, "user_id">;

export interface SeedCreativeTarget {
  id: string;
  platform: AdPlatform;
  /** Display label (only used by callers; not stored on metrics). */
  label?: string;
  /** Day index (0 = oldest) the creative launched. Earlier rows are skipped. */
  launchDayOffset?: number;
  /** CVR multiplier (>1 = better converter → lower CPA). Default derived from id. */
  quality?: number;
  /** CTR multiplier (engagement quality). Default derived from id. */
  ctrQuality?: number;
}

export interface SeedCampaignTarget {
  campaignId: string;
  name: string;
  creatives: SeedCreativeTarget[];
}

export interface GenerateOptions {
  /** Number of days of history. Default 90. */
  days?: number;
  /** Inclusive end date (`YYYY-MM-DD`). Default: today (UTC). */
  endDate?: string;
  /** RNG seed root for reproducibility. Default: the campaign id. */
  seed?: string;
  /** Inject CPA spike / CTR drop / spend surge anomalies. Default true. */
  injectAnomalies?: boolean;
}

export interface InjectedAnomaly {
  platform: AdPlatform;
  metric: "cpa" | "ctr" | "spend";
  kind: "spike" | "drop" | "surge";
  date: string;
  creativeId: string | null;
}

export interface GeneratedDataset {
  metrics: MetricSeed[];
  injected: InjectedAnomaly[];
}

interface PlatformBaseline {
  impressions: number;
  ctr: number;
  cvr: number;
  cpc: number;
  revPerConv: number;
}

/** Tuned so CPAs land ~$7-$23 and ROAS ~3.7x-11x (Taboola best, TikTok weakest). */
const PLATFORM_BASELINES: Record<AdPlatform, PlatformBaseline> = {
  meta: { impressions: 5200, ctr: 0.018, cvr: 0.058, cpc: 0.95, revPerConv: 96 },
  google: { impressions: 3800, ctr: 0.052, cvr: 0.075, cpc: 1.7, revPerConv: 120 },
  tiktok: { impressions: 9000, ctr: 0.011, cvr: 0.03, cpc: 0.55, revPerConv: 68 },
  taboola: { impressions: 12000, ctr: 0.0042, cvr: 0.05, cpc: 0.38, revPerConv: 88 },
  youtube: { impressions: 4000, ctr: 0.009, cvr: 0.025, cpc: 1.1, revPerConv: 90 },
  linkedin: { impressions: 1500, ctr: 0.006, cvr: 0.04, cpc: 5.5, revPerConv: 220 },
  x: { impressions: 3000, ctr: 0.008, cvr: 0.02, cpc: 1.2, revPerConv: 75 },
};

/** Sun..Sat multipliers - weekends softer, mid-week peak (finance audience). */
const WEEKDAY_SEASONALITY = [0.82, 0.98, 1.05, 1.06, 1.04, 0.96, 0.8];

const FATIGUE_FLOOR = 0.5; // CTR never decays below 50% of its fresh value
const FATIGUE_TAU = 38; // decay time-constant in days

interface Injection {
  platform: AdPlatform;
  metric: "cpa" | "ctr" | "spend";
  kind: "spike" | "drop" | "surge";
  /** Days before the end date the event peaks. */
  offsetFromEnd: number;
  /** Number of consecutive days the event lasts. */
  spanDays: number;
  cpcMult?: number;
  convMult?: number;
  ctrMult?: number;
  imprMult?: number;
}

const INJECTIONS: Injection[] = [
  { platform: "taboola", metric: "cpa", kind: "spike", offsetFromEnd: 5, spanDays: 2, cpcMult: 2.9, convMult: 0.4 },
  { platform: "meta", metric: "ctr", kind: "drop", offsetFromEnd: 7, spanDays: 3, ctrMult: 0.34 },
  { platform: "google", metric: "spend", kind: "surge", offsetFromEnd: 14, spanDays: 1, imprMult: 2.5 },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Stable hash of a string into [0, 1) for deriving per-creative defaults. */
function unitHash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function resolveQuality(creative: SeedCreativeTarget): { quality: number; ctrQuality: number } {
  const quality = creative.quality ?? 0.85 + unitHash(`${creative.id}:cvr`) * 0.4; // 0.85..1.25
  const ctrQuality = creative.ctrQuality ?? 0.9 + unitHash(`${creative.id}:ctr`) * 0.3; // 0.9..1.2
  return { quality, ctrQuality };
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generate the full dataset for one campaign target. Returns the metric rows and
 * the list of injected anomalies (so tests can assert the detector catches them).
 */
export function generateMetrics(target: SeedCampaignTarget, options: GenerateOptions = {}): GeneratedDataset {
  const days = options.days ?? 90;
  const endDate = options.endDate ? options.endDate.slice(0, 10) : todayUtc();
  const seedRoot = options.seed ?? target.campaignId;
  const inject = options.injectAnomalies ?? true;

  const presentPlatforms = new Set(target.creatives.map((c) => c.platform));
  const activeInjections = inject ? INJECTIONS.filter((i) => presentPlatforms.has(i.platform)) : [];

  const injected: InjectedAnomaly[] = activeInjections.map((i) => ({
    platform: i.platform,
    metric: i.metric,
    kind: i.kind,
    date: addDays(endDate, -i.offsetFromEnd),
    creativeId: null,
  }));

  const metrics: MetricSeed[] = [];

  for (const creative of target.creatives) {
    const baseline = PLATFORM_BASELINES[creative.platform];
    const { quality, ctrQuality } = resolveQuality(creative);
    const launchOffset = Math.max(0, creative.launchDayOffset ?? 0);

    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      const age = dayIndex - launchOffset;
      if (age < 0) continue; // creative not launched yet

      const daysFromEnd = days - 1 - dayIndex;
      const date = addDays(endDate, -daysFromEnd);
      const rng = makeRng(`${seedRoot}:${creative.id}:${dayIndex}`);

      const seasonality = WEEKDAY_SEASONALITY[weekday(date)];
      const trend = 1 + Math.min(0.18, 0.0012 * dayIndex); // slow scaling, capped +18%
      const ramp = age < 7 ? 0.5 + (age / 7) * 0.5 : 1; // ease-in over the first week
      const fatigue = FATIGUE_FLOOR + (1 - FATIGUE_FLOOR) * Math.exp(-age / FATIGUE_TAU);

      let impressions = baseline.impressions * seasonality * trend * ramp * rng.jitter(0.1);
      let ctr = baseline.ctr * ctrQuality * fatigue * rng.jitter(0.08);
      const cvr = clamp(baseline.cvr * quality * rng.jitter(0.1), 0.002, 0.5);
      let cpc = baseline.cpc * rng.jitter(0.07);
      const revPerConv = baseline.revPerConv * rng.jitter(0.06);

      // Apply any injected anomaly hitting this platform/day.
      for (const i of activeInjections) {
        if (i.platform !== creative.platform) continue;
        if (daysFromEnd > i.offsetFromEnd || daysFromEnd <= i.offsetFromEnd - i.spanDays) continue;
        if (i.imprMult) impressions *= i.imprMult;
        if (i.ctrMult) ctr *= i.ctrMult;
        if (i.cpcMult) cpc *= i.cpcMult;
      }

      ctr = clamp(ctr, 0.0005, 0.25);
      impressions = Math.max(0, Math.round(impressions));
      const clicks = Math.min(impressions, Math.round(impressions * ctr));

      let conversions = Math.round(clicks * cvr);
      for (const i of activeInjections) {
        if (i.platform !== creative.platform || !i.convMult) continue;
        if (daysFromEnd > i.offsetFromEnd || daysFromEnd <= i.offsetFromEnd - i.spanDays) continue;
        conversions = Math.round(conversions * i.convMult);
      }
      conversions = Math.min(clicks, Math.max(0, conversions));

      const spend = Math.round(clicks * cpc * 100) / 100;
      const revenue = Math.round(conversions * revPerConv * 100) / 100;

      metrics.push({
        campaign_id: target.campaignId,
        creative_id: creative.id,
        platform: creative.platform,
        date,
        impressions,
        clicks,
        conversions,
        spend,
        revenue,
        cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : null,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 1e6) / 1e6 : null,
        cvr: clicks > 0 ? Math.round((conversions / clicks) * 1e6) / 1e6 : null,
        roas: spend > 0 ? Math.round((revenue / spend) * 1e4) / 1e4 : null,
      });
    }
  }

  return { metrics, injected };
}

/** Total spend implied by a generated dataset (handy for tests / summaries). */
export function totalSpend(dataset: GeneratedDataset): number {
  return Math.round(dataset.metrics.reduce((sum, m) => sum + (m.spend ?? 0), 0) * 100) / 100;
}
