import type { MetricKey } from "./types";

/**
 * Display formatters for analytics. Pure + client-safe (used by the Recharts
 * panels and metric cards). All numbers render in a compact, scannable form so
 * dense metric columns stay aligned under `font-mono`.
 */

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  taboola: "Taboola",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
};

/** Human label for a platform key (title-cases unknown values). */
export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** Compact integer-ish number: 1_240 -> "1.2k", 3_400_000 -> "3.4M". */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs < 1000) return Math.round(value).toLocaleString("en-US");
  if (abs < 1_000_000) return `${trim(value / 1000)}k`;
  if (abs < 1_000_000_000) return `${trim(value / 1_000_000)}M`;
  return `${trim(value / 1_000_000_000)}B`;
}

/** Currency, compact for large values: 12_400 -> "$12.4k", 940 -> "$940". */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs < 1000) return `${sign}$${abs.toFixed(abs < 100 ? 2 : 0)}`;
  return `${sign}$${formatCompact(abs)}`;
}

/** Ratio (0-1) as a percent string: 0.0182 -> "1.82%". */
export function formatPercent(ratio: number, digits = 2): string {
  if (!Number.isFinite(ratio)) return "-";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** ROAS-style multiplier: 6.73 -> "6.7x". */
export function formatMultiplier(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}x`;
}

/** Signed percentage-change label: 12.4 -> "+12.4%", null -> "-". */
export function formatChangePct(change: number | null): string {
  if (change === null || !Number.isFinite(change)) return "-";
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

/** Format a metric value the way its unit demands (currency/percent/x/count). */
export function formatMetric(metric: MetricKey, value: number): string {
  switch (metric) {
    case "spend":
    case "revenue":
    case "cpa":
      return formatCurrency(value);
    case "ctr":
    case "cvr":
      return formatPercent(value);
    case "roas":
      return formatMultiplier(value);
    case "impressions":
    case "clicks":
    case "conversions":
    default:
      return formatCompact(value);
  }
}

/** Short metric label for axes/legends. */
export function metricLabel(metric: MetricKey): string {
  switch (metric) {
    case "cpa":
      return "CPA";
    case "ctr":
      return "CTR";
    case "cvr":
      return "CVR";
    case "roas":
      return "ROAS";
    default:
      return metric.charAt(0).toUpperCase() + metric.slice(1);
  }
}

/** Format an ISO date as a compact axis label: "2026-06-12" -> "Jun 12". */
export function formatDateLabel(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Drop a trailing ".0" so "1.0k" renders as "1k" but "1.2k" stays. */
function trim(value: number): string {
  const rounded = value.toFixed(1);
  return rounded.endsWith(".0") ? rounded.slice(0, -2) : rounded;
}
