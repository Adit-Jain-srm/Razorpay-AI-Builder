import type { PerformanceMetricRow } from "@/types/database";

import { round, safeDiv, sum } from "./math";
import type {
  CreativeMeta,
  CreativePerformance,
  FunnelStage,
  MetricKey,
  MetricSummary,
  PlatformSummary,
  SeriesPoint,
  SummaryDeltas,
} from "./types";
import { METRIC_KEYS } from "./types";
import { percentChange } from "./math";

/**
 * Aggregation over `performance_metrics` rows. PURE - the single source of truth
 * for every roll-up the dashboard, recommender, and brief consume. Ratios are
 * always recomputed from summed totals (never averaged from per-row ratios),
 * which is the only correct way to aggregate CTR/CVR/CPA/ROAS.
 */

/* -------------------------------------------------------------------------- */
/* Date helpers (UTC, ISO YYYY-MM-DD - lexicographically sortable)            */
/* -------------------------------------------------------------------------- */

/** Normalize any ISO-ish value to a `YYYY-MM-DD` day key. */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Add `n` days to a `YYYY-MM-DD` date (UTC), returning a `YYYY-MM-DD` string. */
export function addDays(iso: string, n: number): string {
  const date = new Date(`${dayKey(iso)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** The inclusive [min, max] date range present in the rows (null when empty). */
export function dateRange(rows: readonly PerformanceMetricRow[]): { from: string; to: string } | null {
  if (rows.length === 0) return null;
  let from = dayKey(rows[0].date);
  let to = from;
  for (const row of rows) {
    const d = dayKey(row.date);
    if (d < from) from = d;
    if (d > to) to = d;
  }
  return { from, to };
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                  */
/* -------------------------------------------------------------------------- */

export interface MetricFilter {
  platform?: string;
  creativeId?: string;
  /** Inclusive `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive `YYYY-MM-DD`. */
  to?: string;
}

/** Filter rows by platform / creative / inclusive date window. */
export function filterMetrics(rows: readonly PerformanceMetricRow[], filter: MetricFilter): PerformanceMetricRow[] {
  return rows.filter((row) => {
    if (filter.platform && row.platform !== filter.platform) return false;
    if (filter.creativeId && row.creative_id !== filter.creativeId) return false;
    const d = dayKey(row.date);
    if (filter.from && d < filter.from) return false;
    if (filter.to && d > filter.to) return false;
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Core roll-up                                                               */
/* -------------------------------------------------------------------------- */

/** Roll a set of rows into a single summary (ratios from summed totals). */
export function summarize(rows: readonly PerformanceMetricRow[]): MetricSummary {
  const impressions = sum(rows.map((r) => r.impressions));
  const clicks = sum(rows.map((r) => r.clicks));
  const conversions = sum(rows.map((r) => r.conversions));
  const spend = sum(rows.map((r) => r.spend));
  const revenue = sum(rows.map((r) => r.revenue));
  return {
    impressions,
    clicks,
    conversions,
    spend: round(spend),
    revenue: round(revenue),
    ctr: round(safeDiv(clicks, impressions), 6),
    cvr: round(safeDiv(conversions, clicks), 6),
    cpa: round(safeDiv(spend, conversions), 4),
    roas: round(safeDiv(revenue, spend), 4),
  };
}

/** Read a metric off a computed summary. */
export function metricValue(summary: MetricSummary, metric: MetricKey): number {
  return summary[metric];
}

/** Generic group-by: collapse rows into summaries keyed by `keyOf`. */
function groupBy(
  rows: readonly PerformanceMetricRow[],
  keyOf: (row: PerformanceMetricRow) => string | null,
): Map<string, PerformanceMetricRow[]> {
  const groups = new Map<string, PerformanceMetricRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

/* -------------------------------------------------------------------------- */
/* Platform + creative breakdowns                                             */
/* -------------------------------------------------------------------------- */

/** Per-platform summaries, sorted by spend desc, with each platform's spend share. */
export function summarizeByPlatform(rows: readonly PerformanceMetricRow[]): PlatformSummary[] {
  const totalSpend = sum(rows.map((r) => r.spend));
  const groups = groupBy(rows, (r) => r.platform);
  const out: PlatformSummary[] = [];
  for (const [platform, group] of groups) {
    const summary = summarize(group);
    out.push({ platform, ...summary, spendShare: round(safeDiv(summary.spend, totalSpend), 4) });
  }
  return out.sort((a, b) => b.spend - a.spend);
}

/**
 * Per-creative summaries (rows with a `creative_id`), sorted by spend desc.
 * Labels resolve from `meta`; unknown creatives fall back to a short id.
 */
export function summarizeByCreative(
  rows: readonly PerformanceMetricRow[],
  meta: ReadonlyMap<string, CreativeMeta>,
): CreativePerformance[] {
  const groups = groupBy(rows, (r) => r.creative_id);
  const out: CreativePerformance[] = [];
  for (const [creativeId, group] of groups) {
    const summary = summarize(group);
    const info = meta.get(creativeId);
    out.push({
      creativeId,
      label: info?.label ?? `Creative ${creativeId.slice(0, 6)}`,
      platform: info?.platform ?? group[0]?.platform ?? "-",
      ...summary,
    });
  }
  return out.sort((a, b) => b.spend - a.spend);
}

/* -------------------------------------------------------------------------- */
/* Time series                                                               */
/* -------------------------------------------------------------------------- */

/** A daily series for one metric (one point per day, ascending by date). */
export function dailySeries(rows: readonly PerformanceMetricRow[], metric: MetricKey): SeriesPoint[] {
  const byDate = groupBy(rows, (r) => dayKey(r.date));
  return [...byDate.entries()]
    .map(([date, group]) => ({ date, value: round(metricValue(summarize(group), metric), 6) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** All distinct day keys present, ascending. */
export function distinctDates(rows: readonly PerformanceMetricRow[]): string[] {
  return [...new Set(rows.map((r) => dayKey(r.date)))].sort((a, b) => a.localeCompare(b));
}

/**
 * Wide pivot for a stacked/multi-line chart: one record per date with a numeric
 * column per platform (0 when a platform has no data that day).
 */
export function dailyMetricByPlatform(
  rows: readonly PerformanceMetricRow[],
  metric: MetricKey,
  platforms: readonly string[],
): Array<Record<string, number | string>> {
  const dates = distinctDates(rows);
  const byPlatform = new Map<string, Map<string, SeriesPoint>>();
  for (const platform of platforms) {
    const series = dailySeries(filterMetrics(rows, { platform }), metric);
    byPlatform.set(platform, new Map(series.map((p) => [p.date, p])));
  }
  return dates.map((date) => {
    const record: Record<string, number | string> = { date };
    for (const platform of platforms) {
      record[platform] = byPlatform.get(platform)?.get(date)?.value ?? 0;
    }
    return record;
  });
}

/* -------------------------------------------------------------------------- */
/* Funnel                                                                     */
/* -------------------------------------------------------------------------- */

/** Modeled intermediate-stage rates (no LP-view/lead columns exist on metrics). */
const LP_VIEW_RATE = 0.82; // share of clicks that load the landing page
const CONVERSION_OF_LEAD = 0.55; // share of leads that become conversions

/**
 * Impression -> Click -> LP View -> Lead -> Conversion funnel. Impressions,
 * clicks, and conversions are real; LP Views and Leads are modeled from fixed,
 * documented ratios (the metrics table has no LP-view/lead columns) and clamped
 * so the funnel is always monotonically non-increasing.
 */
export function funnel(rows: readonly PerformanceMetricRow[]): FunnelStage[] {
  const s = summarize(rows);
  const impressions = s.impressions;
  const clicks = Math.min(s.clicks, impressions);
  const lpViews = Math.min(Math.round(clicks * LP_VIEW_RATE), clicks);
  const conversions = Math.min(s.conversions, lpViews);
  const leads = Math.min(Math.max(Math.round(conversions / CONVERSION_OF_LEAD), conversions), lpViews);

  const values: Array<[FunnelStage["stage"], number]> = [
    ["Impressions", impressions],
    ["Clicks", clicks],
    ["LP Views", lpViews],
    ["Leads", leads],
    ["Conversions", conversions],
  ];

  const top = impressions;
  let prev: number | null = null;
  return values.map(([stage, value]) => {
    const out: FunnelStage = {
      stage,
      value,
      stepRate: prev === null ? null : round(safeDiv(value, prev), 4),
      overallRate: round(safeDiv(value, top), 6),
    };
    prev = value;
    return out;
  });
}

/* -------------------------------------------------------------------------- */
/* Period-over-period deltas                                                  */
/* -------------------------------------------------------------------------- */

/** Build an all-zero delta record (used when there is no comparison window). */
function emptyDeltas(current: MetricSummary): SummaryDeltas {
  const deltas = {} as SummaryDeltas;
  for (const metric of METRIC_KEYS) {
    deltas[metric] = { current: current[metric], previous: 0, changePct: null };
  }
  return deltas;
}

/**
 * Compare the most recent `days`-day window against the immediately preceding
 * window of the same length. `endDate` defaults to the latest date in the rows.
 */
export function periodDeltas(
  rows: readonly PerformanceMetricRow[],
  days = 7,
  endDate?: string,
): SummaryDeltas {
  const range = dateRange(rows);
  if (!range) return emptyDeltas(summarize(rows));
  const end = endDate ? dayKey(endDate) : range.to;

  const currentStart = addDays(end, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));

  const current = summarize(filterMetrics(rows, { from: currentStart, to: end }));
  const previous = summarize(filterMetrics(rows, { from: previousStart, to: previousEnd }));

  const deltas = {} as SummaryDeltas;
  for (const metric of METRIC_KEYS) {
    deltas[metric] = {
      current: current[metric],
      previous: previous[metric],
      changePct: percentChange(current[metric], previous[metric]),
    };
  }
  return deltas;
}
