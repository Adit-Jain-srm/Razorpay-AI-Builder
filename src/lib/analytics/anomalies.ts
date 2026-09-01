import type { AnomalyInsert, PerformanceMetricRow } from "@/types/database";

import { dailySeries, distinctDates, filterMetrics, summarize } from "./aggregate";
import { formatCurrency, formatPercent, platformLabel } from "./format";
import { clamp, mean, round, stddev } from "./math";
import type { AnomalyFinding, AnomalyMetric, AnomalySeverity, SeriesPoint } from "./types";

/**
 * Z-score anomaly detection over metric time series. PURE + deterministic so it
 * is unit-testable: feed it a series with an injected spike and it flags it.
 *
 * Strategy: for each scope (per-platform and cross-platform "all") and each
 * monitored metric, build a clean daily series (dropping undefined points like a
 * CPA day with zero conversions), compute population z-scores, and flag points
 * whose deviation exceeds a threshold in the *harmful* direction:
 *   - CPA   spikes UP   (more expensive conversions)
 *   - CTR   drops DOWN  (creative fatigue / audience saturation)
 *   - Spend deviates EITHER way (pacing / budget anomalies)
 * Consecutive exceedances are collapsed to a single peak so one event is one
 * finding, not a noisy run.
 */

export interface DetectOptions {
  /** Minimum |z| to flag. Default 2.5. */
  threshold?: number;
  /** Minimum points required for a meaningful baseline. Default 10. */
  minPoints?: number;
  direction?: "high" | "low" | "both";
}

export interface SeriesAnomaly {
  date: string;
  value: number;
  zScore: number;
  severity: AnomalySeverity;
  baseline: number;
}

const DEFAULT_THRESHOLD = 2.5;
const DEFAULT_MIN_POINTS = 10;

function severityFor(absZ: number): AnomalySeverity {
  if (absZ >= 4) return "critical";
  if (absZ >= 3.25) return "high";
  if (absZ >= 2.75) return "medium";
  return "low";
}

function isHarmful(z: number, direction: "high" | "low" | "both", threshold: number): boolean {
  if (direction === "high") return z >= threshold;
  if (direction === "low") return z <= -threshold;
  return Math.abs(z) >= threshold;
}

/**
 * Detect anomalies in a single dated series. Returns one finding per contiguous
 * run of exceedances (the peak of the run).
 */
export function detectSeriesAnomalies(points: readonly SeriesPoint[], opts: DetectOptions = {}): SeriesAnomaly[] {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const minPoints = opts.minPoints ?? DEFAULT_MIN_POINTS;
  const direction = opts.direction ?? "both";

  if (points.length < minPoints) return [];
  const values = points.map((p) => p.value);
  const m = mean(values);
  const sd = stddev(values);
  if (sd === 0) return [];

  const z = values.map((v) => (v - m) / sd);
  const out: SeriesAnomaly[] = [];

  let i = 0;
  while (i < points.length) {
    if (!isHarmful(z[i], direction, threshold)) {
      i++;
      continue;
    }
    let peak = i;
    let j = i;
    while (j < points.length && isHarmful(z[j], direction, threshold)) {
      if (Math.abs(z[j]) > Math.abs(z[peak])) peak = j;
      j++;
    }
    out.push({
      date: points[peak].date,
      value: points[peak].value,
      zScore: round(z[peak], 2),
      severity: severityFor(Math.abs(z[peak])),
      baseline: round(m, 4),
    });
    i = j;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Series construction (drops undefined points per metric)                    */
/* -------------------------------------------------------------------------- */

/** Build a clean daily series for an anomaly metric, dropping undefined days. */
function cleanSeries(rows: readonly PerformanceMetricRow[], metric: AnomalyMetric): SeriesPoint[] {
  if (metric === "spend") return dailySeries(rows, "spend");

  // CPA needs conversions > 0; CTR needs impressions > 0. Otherwise the day is
  // not a real observation and would distort the baseline.
  const dates = distinctDates(rows);
  const points: SeriesPoint[] = [];
  for (const date of dates) {
    const dayRows = filterMetrics(rows, { from: date, to: date });
    const s = summarize(dayRows);
    if (metric === "cpa") {
      if (s.conversions > 0) points.push({ date, value: s.cpa });
    } else if (s.impressions > 0) {
      points.push({ date, value: s.ctr });
    }
  }
  return points;
}

/* -------------------------------------------------------------------------- */
/* Campaign-level detection                                                   */
/* -------------------------------------------------------------------------- */

const METRIC_DIRECTION: Record<AnomalyMetric, "high" | "low" | "both"> = {
  cpa: "high",
  ctr: "low",
  spend: "both",
};

function describe(metric: AnomalyMetric, scopeLabel: string, anomaly: SeriesAnomaly): string {
  const deltaPct = anomaly.baseline === 0 ? 0 : Math.round(((anomaly.value - anomaly.baseline) / anomaly.baseline) * 100);
  const absPct = Math.abs(deltaPct);
  switch (metric) {
    case "cpa":
      return `CPA on ${scopeLabel} spiked to ${formatCurrency(anomaly.value)} on ${anomaly.date} (${absPct}% above the ${formatCurrency(anomaly.baseline)} norm).`;
    case "ctr":
      return `CTR on ${scopeLabel} dropped to ${formatPercent(anomaly.value)} on ${anomaly.date} (${absPct}% below the ${formatPercent(anomaly.baseline)} norm).`;
    case "spend": {
      const verb = anomaly.value >= anomaly.baseline ? "surged" : "dipped";
      return `Spend on ${scopeLabel} ${verb} to ${formatCurrency(anomaly.value)} on ${anomaly.date} (${absPct}% ${anomaly.value >= anomaly.baseline ? "above" : "below"} the ${formatCurrency(anomaly.baseline)} pace).`;
    }
  }
}

const SEVERITY_RANK: Record<AnomalySeverity, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export interface CampaignAnomalyOptions extends DetectOptions {
  /** Cap the number of findings returned (most severe + most recent first). */
  limit?: number;
  /** Also scan the cross-platform "all" series. Default true. */
  includeOverall?: boolean;
}

/**
 * Detect anomalies across a campaign's metric rows: per platform and (optionally)
 * cross-platform, for CPA / CTR / spend. Returns findings sorted by severity then
 * recency, capped at `limit`.
 */
export function detectCampaignAnomalies(
  rows: readonly PerformanceMetricRow[],
  options: CampaignAnomalyOptions = {},
): AnomalyFinding[] {
  const { limit = 12, includeOverall = true, ...detect } = options;
  if (rows.length === 0) return [];

  const platforms = [...new Set(rows.map((r) => r.platform))].sort();
  const scopes: Array<{ key: string; label: string; rows: readonly PerformanceMetricRow[] }> = platforms.map((platform) => ({
    key: platform,
    label: platformLabel(platform),
    rows: filterMetrics(rows, { platform }),
  }));
  if (includeOverall && platforms.length > 1) {
    scopes.push({ key: "all", label: "all platforms", rows });
  }

  const findings: AnomalyFinding[] = [];
  for (const scope of scopes) {
    for (const metric of ["cpa", "ctr", "spend"] as const) {
      const series = cleanSeries(scope.rows, metric);
      const anomalies = detectSeriesAnomalies(series, { ...detect, direction: METRIC_DIRECTION[metric] });
      for (const anomaly of anomalies) {
        findings.push({
          metric,
          platform: scope.key,
          severity: anomaly.severity,
          description: describe(metric, scope.label, anomaly),
          detectedAt: `${anomaly.date}T12:00:00.000Z`,
          zScore: anomaly.zScore,
          value: anomaly.value,
          baseline: anomaly.baseline,
        });
      }
    }
  }

  findings.sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    if (a.detectedAt !== b.detectedAt) return b.detectedAt.localeCompare(a.detectedAt);
    return Math.abs(b.zScore) - Math.abs(a.zScore);
  });

  return findings.slice(0, clamp(limit, 0, findings.length));
}

/** Map findings onto `anomalies` inserts (the store adds `user_id`). */
export function toAnomalyInserts(
  findings: readonly AnomalyFinding[],
  campaignId: string,
): Array<Omit<AnomalyInsert, "user_id">> {
  return findings.map((finding) => ({
    campaign_id: campaignId,
    metric: finding.platform === "all" ? finding.metric : `${finding.metric}:${finding.platform}`,
    severity: finding.severity,
    description: finding.description,
    detected_at: finding.detectedAt,
  }));
}
