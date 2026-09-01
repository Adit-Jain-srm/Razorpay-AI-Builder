import type { SeriesPoint } from "./types";

/**
 * Pure statistics + numeric helpers for analytics. No DB/network/env, no `any`.
 * These are the building blocks for aggregation, anomaly detection (z-scores),
 * and trendlines, so they are unit-tested directly.
 */

/** Sum of an array (0 for empty). */
export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/** Arithmetic mean (0 for empty). */
export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

/**
 * Population standard deviation (0 for fewer than 2 points). Population (not
 * sample) is intentional: z-scores here describe the observed series itself.
 */
export function stddev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const value of values) {
    const d = value - m;
    acc += d * d;
  }
  return Math.sqrt(acc / values.length);
}

/** Median (0 for empty). Does not mutate the input. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Z-scores for each value against the series mean/stddev. When the series has no
 * spread (stddev 0) every z-score is 0 - a flat line has no anomalies.
 */
export function zScores(values: readonly number[]): number[] {
  const m = mean(values);
  const sd = stddev(values);
  if (sd === 0) return values.map(() => 0);
  return values.map((value) => (value - m) / sd);
}

/** Division that returns `fallback` (default 0) instead of NaN/Infinity. */
export function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Signed percentage change from `previous` to `current`. Returns `null` when the
 * baseline is 0 (an undefined change) so callers can render "-" instead of ∞.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Clamp `n` into the inclusive `[min, max]` range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Round to `digits` decimal places (banker-free, predictable). */
export function round(n: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

export interface Trendline {
  slope: number;
  intercept: number;
  /** Fitted value at each x-index (0..n-1), aligned to the input order. */
  points: number[];
}

/**
 * Ordinary least-squares trendline over an evenly-spaced series (x = index).
 * Returns a flat line at the mean for fewer than 2 points. Used to overlay a
 * direction-of-travel line on the time-series chart.
 */
export function linearTrend(values: readonly number[]): Trendline {
  const n = values.length;
  if (n < 2) {
    const flat = n === 1 ? values[0] : 0;
    return { slope: 0, intercept: flat, points: values.map(() => flat) };
  }
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    num += dx * (values[i] - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept, points: xs.map((x) => intercept + slope * x) };
}

/** Attach an OLS trendline to a dated series (same dates, fitted values). */
export function trendlineSeries(series: readonly SeriesPoint[]): SeriesPoint[] {
  const fit = linearTrend(series.map((p) => p.value));
  return series.map((p, i) => ({ date: p.date, value: round(fit.points[i], 4) }));
}

/**
 * Simple trailing moving average with the given window. The first
 * `window - 1` points average over the data available so far (no leading nulls),
 * keeping the line continuous for charts.
 */
export function movingAverage(values: readonly number[], window: number): number[] {
  if (window <= 1) return [...values];
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    out.push(mean(values.slice(start, i + 1)));
  }
  return out;
}
