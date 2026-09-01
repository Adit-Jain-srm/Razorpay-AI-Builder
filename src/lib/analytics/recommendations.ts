import type { PerformanceMetricRow } from "@/types/database";

import { dailySeries, dateRange, summarize, summarizeByCreative, summarizeByPlatform } from "./aggregate";
import { formatCurrency, formatPercent, platformLabel } from "./format";
import { mean, round } from "./math";
import type { AnomalyFinding, CreativeMeta, CreativePerformance, Recommendation, RecommendationPriority } from "./types";

/**
 * Recommendation engine - PURE heuristics over aggregated metrics that produce
 * actionable, id-anchored next steps for the Operator's improvement loop:
 *   - SCALE   a creative whose CPA is well below the campaign average
 *   - PAUSE   a creative whose CPA has run over target for N straight days
 *   - REFRESH a creative whose CTR has decayed (fatigue)
 *   - REALLOCATE budget toward the platform with the best ROAS
 *   - INVESTIGATE a high-severity anomaly (when findings are supplied)
 *
 * Every recommendation carries the real `campaignId` / `creativeId` / `platform`
 * it refers to, so the agent and dashboard can act on it directly.
 */

export interface RecommendationOptions {
  /** Min conversions a creative needs before scale/pause advice (default 12). */
  minConversions?: number;
  /** Scale when CPA <= average * this ratio (default 0.78 → ≥22% lower). */
  scaleCpaRatio?: number;
  /** Pause when CPA exceeds the target for this many trailing days (default 3). */
  pauseDays?: number;
  /** Pause target = campaign avg CPA * this ratio, unless `targetCpa` is set (default 1.4). */
  pauseTargetRatio?: number;
  /** Explicit CPA target; overrides the derived one. */
  targetCpa?: number;
  /** Refresh when CTR drops by at least this fraction across the creative's life (default 0.3). */
  fatigueDropPct?: number;
  /** Reallocate when best ROAS >= worst ROAS * this ratio (default 1.3). */
  reallocRatio?: number;
  /** Cap on returned recommendations (default 6). */
  limit?: number;
}

export interface RecommendationInput {
  rows: readonly PerformanceMetricRow[];
  campaignId: string;
  meta: ReadonlyMap<string, CreativeMeta>;
  /** Optional anomaly findings → "investigate" recommendations. */
  anomalies?: readonly AnomalyFinding[];
  options?: RecommendationOptions;
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = { high: 2, medium: 1, low: 0 };

/** Trailing count of consecutive days whose value exceeds `target`. */
function trailingDaysOver(series: ReadonlyArray<{ value: number }>, target: number): number {
  let count = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value > target) count++;
    else break;
  }
  return count;
}

/** Daily CPA series for one creative (only days with conversions). */
function creativeDailyCpa(rows: readonly PerformanceMetricRow[], creativeId: string): Array<{ date: string; value: number }> {
  const creativeRows = rows.filter((r) => r.creative_id === creativeId);
  const dates = [...new Set(creativeRows.map((r) => r.date.slice(0, 10)))].sort();
  const out: Array<{ date: string; value: number }> = [];
  for (const date of dates) {
    const s = summarize(creativeRows.filter((r) => r.date.slice(0, 10) === date));
    if (s.conversions > 0) out.push({ date, value: s.cpa });
  }
  return out;
}

/** Mean CTR of the first vs last third of a creative's active life (fatigue). */
function fatigueDrop(rows: readonly PerformanceMetricRow[], creativeId: string): { dropPct: number; first: number; last: number } | null {
  const series = dailySeries(
    rows.filter((r) => r.creative_id === creativeId && r.impressions > 0),
    "ctr",
  );
  if (series.length < 9) return null;
  const third = Math.floor(series.length / 3);
  const first = mean(series.slice(0, third).map((p) => p.value));
  const last = mean(series.slice(series.length - third).map((p) => p.value));
  if (first <= 0) return null;
  return { dropPct: (first - last) / first, first, last };
}

function scaleRecs(creatives: CreativePerformance[], avgCpa: number, input: RecommendationInput, opts: Required<RecommendationOptions>): Recommendation[] {
  if (avgCpa <= 0) return [];
  return creatives
    .filter((c) => c.conversions >= opts.minConversions && c.cpa > 0 && c.cpa <= avgCpa * opts.scaleCpaRatio)
    .slice(0, 2)
    .map((c) => {
      const lowerPct = Math.round((1 - c.cpa / avgCpa) * 100);
      const priority: RecommendationPriority = lowerPct >= 35 ? "high" : "medium";
      return {
        id: `rec:scale:${c.creativeId}`,
        type: "scale" as const,
        priority,
        title: `Scale ${c.label} on ${platformLabel(c.platform)}`,
        rationale: `${lowerPct}% lower CPA (${formatCurrency(c.cpa)}) than the ${formatCurrency(avgCpa)} campaign average on ${c.conversions.toLocaleString("en-US")} conversions.`,
        campaignId: input.campaignId,
        creativeId: c.creativeId,
        platform: c.platform,
        metricLabel: `-${lowerPct}% CPA`,
      };
    });
}

function pauseRecs(creatives: CreativePerformance[], target: number, input: RecommendationInput, opts: Required<RecommendationOptions>): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const c of creatives) {
    if (c.conversions < opts.minConversions) continue;
    const series = creativeDailyCpa(input.rows, c.creativeId);
    const streak = trailingDaysOver(series, target);
    if (streak >= opts.pauseDays) {
      const latest = series[series.length - 1]?.value ?? c.cpa;
      recs.push({
        id: `rec:pause:${c.creativeId}`,
        type: "pause",
        priority: "high",
        title: `Pause ${c.label} on ${platformLabel(c.platform)}`,
        rationale: `CPA has run above the ${formatCurrency(target)} target for ${streak} straight days (now ${formatCurrency(latest)}).`,
        campaignId: input.campaignId,
        creativeId: c.creativeId,
        platform: c.platform,
        metricLabel: `CPA>target ${streak}d`,
      });
    }
  }
  return recs.slice(0, 2);
}

function refreshRecs(creatives: CreativePerformance[], input: RecommendationInput, opts: Required<RecommendationOptions>): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const c of creatives) {
    if (c.conversions < opts.minConversions) continue;
    const fatigue = fatigueDrop(input.rows, c.creativeId);
    if (fatigue && fatigue.dropPct >= opts.fatigueDropPct) {
      const dropPct = Math.round(fatigue.dropPct * 100);
      recs.push({
        id: `rec:refresh:${c.creativeId}`,
        type: "refresh",
        priority: dropPct >= 45 ? "high" : "medium",
        title: `Refresh ${c.label} - creative fatigue`,
        rationale: `CTR fell ${dropPct}% from ${formatPercent(fatigue.first)} to ${formatPercent(fatigue.last)} as the creative aged.`,
        campaignId: input.campaignId,
        creativeId: c.creativeId,
        platform: c.platform,
        metricLabel: `CTR -${dropPct}%`,
      });
    }
  }
  return recs.slice(0, 2);
}

function reallocRec(input: RecommendationInput, opts: Required<RecommendationOptions>): Recommendation | null {
  const platforms = summarizeByPlatform(input.rows).filter((p) => p.spend > 0 && p.revenue > 0);
  if (platforms.length < 2) return null;
  const ranked = [...platforms].sort((a, b) => b.roas - a.roas);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  if (worst.roas <= 0 || best.roas < worst.roas * opts.reallocRatio) return null;
  return {
    id: `rec:reallocate:${best.platform}`,
    type: "reallocate",
    priority: "medium",
    title: `Shift budget toward ${platformLabel(best.platform)}`,
    rationale: `${platformLabel(best.platform)} returns ${best.roas.toFixed(1)}x ROAS vs ${platformLabel(worst.platform)} at ${worst.roas.toFixed(1)}x. Move spend to the leader.`,
    campaignId: input.campaignId,
    creativeId: null,
    platform: best.platform,
    metricLabel: `${best.roas.toFixed(1)}x ROAS`,
  };
}

function investigateRecs(input: RecommendationInput, covered: Set<string>): Recommendation[] {
  const findings = (input.anomalies ?? []).filter((a) => a.severity === "high" || a.severity === "critical");
  const recs: Recommendation[] = [];
  for (const finding of findings.slice(0, 2)) {
    const platform = finding.platform === "all" ? null : finding.platform;
    const scope = platform ? platformLabel(platform) : "all platforms";
    const id = `rec:investigate:${finding.metric}:${finding.platform}`;
    if (covered.has(id)) continue;
    recs.push({
      id,
      type: "investigate",
      priority: finding.severity === "critical" ? "high" : "medium",
      title: `Investigate ${finding.metric.toUpperCase()} anomaly on ${scope}`,
      rationale: finding.description,
      campaignId: input.campaignId,
      creativeId: null,
      platform,
      metricLabel: finding.severity,
    });
  }
  return recs;
}

/**
 * Build the ranked recommendation list. Deterministic for a given input, so it is
 * unit-testable; returns at most `options.limit` items, highest priority first.
 */
export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const opts: Required<RecommendationOptions> = {
    minConversions: input.options?.minConversions ?? 12,
    scaleCpaRatio: input.options?.scaleCpaRatio ?? 0.78,
    pauseDays: input.options?.pauseDays ?? 3,
    pauseTargetRatio: input.options?.pauseTargetRatio ?? 1.4,
    targetCpa: input.options?.targetCpa ?? 0,
    fatigueDropPct: input.options?.fatigueDropPct ?? 0.3,
    reallocRatio: input.options?.reallocRatio ?? 1.3,
    limit: input.options?.limit ?? 6,
  };

  if (input.rows.length === 0) return [];

  const campaign = summarize(input.rows);
  const avgCpa = campaign.cpa;
  const target = opts.targetCpa > 0 ? opts.targetCpa : round(avgCpa * opts.pauseTargetRatio, 4);
  const creatives = summarizeByCreative(input.rows, input.meta);

  const recs: Recommendation[] = [
    ...scaleRecs(creatives, avgCpa, input, opts),
    ...pauseRecs(creatives, target, input, opts),
    ...refreshRecs(creatives, input, opts),
  ];
  const realloc = reallocRec(input, opts);
  if (realloc) recs.push(realloc);
  recs.push(...investigateRecs(input, new Set(recs.map((r) => r.id))));

  // De-duplicate by id (a creative could trip multiple rules) - keep the first
  // (highest-intent) occurrence, then rank by priority.
  const seen = new Set<string>();
  const unique = recs.filter((rec) => (seen.has(rec.id) ? false : (seen.add(rec.id), true)));
  unique.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
  return unique.slice(0, opts.limit);
}

/** Convenience: derived campaign target CPA used by the pause rule + UI. */
export function deriveTargetCpa(rows: readonly PerformanceMetricRow[], ratio = 1.4): number {
  return round(summarize(rows).cpa * ratio, 4);
}

/** True when the rows span fewer than `days` distinct days (advice is weak). */
export function hasThinHistory(rows: readonly PerformanceMetricRow[], days = 14): boolean {
  const range = dateRange(rows);
  if (!range) return true;
  const distinct = new Set(rows.map((r) => r.date.slice(0, 10))).size;
  return distinct < days;
}
