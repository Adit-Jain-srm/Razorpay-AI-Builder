/**
 * A/B split-testing primitives. PURE + deterministic so the public route, the
 * editor stats view, and the tests all share one implementation with no
 * randomness at runtime (assignment is a function of the visitor id + the
 * experiment key only). See `Docs/landing-pages.md` for the full design.
 */

/** A deployed variant participating in an experiment. */
export interface AbVariant {
  id: string;
  /** Relative traffic weight (0 removes from rotation). */
  weight: number;
}

/** A variant's measured performance, used by the winner heuristic. */
export interface VariantPerformance {
  id: string;
  label: string;
  views: number;
  leads: number;
  isControl: boolean;
}

/** FNV-1a hash -> 32-bit unsigned int. Stable across platforms. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts to stay in uint32.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** Maps a seed to a stable bucket in [0, 1). */
export function hashToUnitInterval(seed: string): number {
  return fnv1a(seed) / 0x100000000;
}

/**
 * Deterministically assigns a visitor to one variant, weighted by `weight`.
 * The same `(visitorId, experimentKey)` always resolves to the same variant, so
 * a returning visitor keeps their experience. Variants are sorted by id first so
 * assignment is independent of input order. Zero-weight variants are excluded
 * (used by auto-promote-winner to route all traffic to the winner).
 *
 * Returns null only when there are no positively-weighted variants.
 */
export function assignVariant<T extends AbVariant>(
  visitorId: string,
  experimentKey: string,
  variants: readonly T[],
): T | null {
  const eligible = variants.filter((v) => v.weight > 0).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];

  const total = eligible.reduce((sum, v) => sum + v.weight, 0);
  const target = hashToUnitInterval(`${visitorId}:${experimentKey}`) * total;

  let cumulative = 0;
  for (const variant of eligible) {
    cumulative += variant.weight;
    if (target < cumulative) return variant;
  }
  return eligible[eligible.length - 1];
}

/** Conversion rate (leads / views), guarded against divide-by-zero. */
export function conversionRate(views: number, leads: number): number {
  if (views <= 0) return 0;
  return leads / views;
}

export interface WinnerResult {
  /** Winning variant id, or null when no confident winner yet. */
  winnerId: string | null;
  reason: "winner" | "insufficient_data" | "no_clear_winner";
  /** Best variant's conversion rate (for display even when not yet confident). */
  bestCvr: number;
  /** Relative lift of the best over the next-best (0..1+). */
  relativeLift: number;
}

export interface WinnerOptions {
  /** Minimum views EACH variant needs before a winner can be called. */
  minViewsPerVariant?: number;
  /** Minimum relative CVR lift of the best over the next-best to declare a winner. */
  minRelativeLift?: number;
}

/**
 * Picks an experiment winner by conversion rate using a deliberately
 * conservative, documented heuristic (a lightweight stand-in for a full
 * significance test):
 *
 *   1. Every variant must have at least `minViewsPerVariant` views (default 100)
 *      - otherwise the result is `insufficient_data` (no winner).
 *   2. The best variant's CVR must beat the next-best by at least
 *      `minRelativeLift` relative lift (default 10%) - otherwise `no_clear_winner`.
 *
 * This avoids promoting a variant on noise from a handful of visitors. The
 * thresholds are tunable per call so a live demo can use a smaller sample.
 */
export function pickWinner(variants: readonly VariantPerformance[], options: WinnerOptions = {}): WinnerResult {
  const minViews = options.minViewsPerVariant ?? 100;
  const minLift = options.minRelativeLift ?? 0.1;

  if (variants.length < 2) {
    const only = variants[0];
    return {
      winnerId: null,
      reason: "insufficient_data",
      bestCvr: only ? conversionRate(only.views, only.leads) : 0,
      relativeLift: 0,
    };
  }

  const ranked = variants
    .map((v) => ({ ...v, cvr: conversionRate(v.views, v.leads) }))
    .sort((a, b) => b.cvr - a.cvr);

  const best = ranked[0];
  const runnerUp = ranked[1];
  const enoughData = variants.every((v) => v.views >= minViews);

  if (!enoughData) {
    return { winnerId: null, reason: "insufficient_data", bestCvr: best.cvr, relativeLift: 0 };
  }

  const relativeLift = runnerUp.cvr > 0 ? (best.cvr - runnerUp.cvr) / runnerUp.cvr : best.cvr > 0 ? 1 : 0;
  if (relativeLift < minLift) {
    return { winnerId: null, reason: "no_clear_winner", bestCvr: best.cvr, relativeLift };
  }

  return { winnerId: best.id, reason: "winner", bestCvr: best.cvr, relativeLift };
}
