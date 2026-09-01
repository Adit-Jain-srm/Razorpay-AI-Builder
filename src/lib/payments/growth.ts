/**
 * Growth scorecard and budget reallocation for the campaign orchestrator.
 *
 * Provides:
 * - `getGrowthScorecard` — per-audience CTR/CVR/CPA + Razorpay GMV summary
 * - `computeReallocation` — pure function to shift budget from underperformers
 * - `applyReallocation` — writes new audienceAllocations to campaign budget jsonb
 *
 * All money values are integer paise. PURE except `applyReallocation`.
 */

import type { AudienceAllocation } from "@/lib/campaign/brief";

/* -------------------------------------------------------------------------- */
/* Growth scorecard                                                           */
/* -------------------------------------------------------------------------- */

export interface AudienceMetrics {
  personaId: string;
  personaName: string;
  ctr: number;
  cvr: number;
  cpaPaise: number;
  gmvPaise: number;
  orders: number;
  spend: number;
}

export interface GrowthScorecard {
  campaignId: string;
  currency: string;
  totalGmvPaise: number;
  totalOrders: number;
  audiences: AudienceMetrics[];
  /** Best performer by CPA (lowest). */
  bestAudience: string | null;
  /** Worst performer by CPA (highest). */
  worstAudience: string | null;
}

/**
 * Build a growth scorecard from per-audience metrics.
 * In demo mode, uses seeded data. In production, would join orders + analytics.
 */
export function buildGrowthScorecard(
  campaignId: string,
  audiences: AudienceMetrics[],
  currency = "INR",
): GrowthScorecard {
  const totalGmvPaise = audiences.reduce((sum, a) => sum + a.gmvPaise, 0);
  const totalOrders = audiences.reduce((sum, a) => sum + a.orders, 0);

  const withOrders = audiences.filter((a) => a.orders > 0);
  const bestAudience = withOrders.length > 0
    ? withOrders.reduce((best, a) => (a.cpaPaise < best.cpaPaise ? a : best)).personaId
    : null;
  const worstAudience = withOrders.length > 0
    ? withOrders.reduce((worst, a) => (a.cpaPaise > worst.cpaPaise ? a : worst)).personaId
    : null;

  return {
    campaignId,
    currency,
    totalGmvPaise,
    totalOrders,
    audiences,
    bestAudience,
    worstAudience,
  };
}

/* -------------------------------------------------------------------------- */
/* Reallocation                                                               */
/* -------------------------------------------------------------------------- */

export interface ReallocationProposal {
  from: { personaId: string; currentPercent: number; newPercent: number };
  to: { personaId: string; currentPercent: number; newPercent: number };
  shiftPercent: number;
  reason: string;
}

/**
 * Compute a budget reallocation from the worst-performing audience to the best.
 * PURE — does not write to the database.
 *
 * @param allocations Current audience allocations
 * @param scorecard Growth scorecard with per-audience CPA
 * @param maxShiftPercent Maximum percentage points to move in one step (default 15)
 */
export function computeReallocation(
  allocations: AudienceAllocation[],
  scorecard: GrowthScorecard,
  maxShiftPercent = 15,
): ReallocationProposal | null {
  if (!scorecard.bestAudience || !scorecard.worstAudience) return null;
  if (scorecard.bestAudience === scorecard.worstAudience) return null;

  const fromAlloc = allocations.find((a) => a.personaId === scorecard.worstAudience);
  const toAlloc = allocations.find((a) => a.personaId === scorecard.bestAudience);

  if (!fromAlloc || !toAlloc) return null;
  if (fromAlloc.percent <= 0) return null;

  const shift = Math.min(maxShiftPercent, fromAlloc.percent);

  const bestMetrics = scorecard.audiences.find((a) => a.personaId === scorecard.bestAudience);
  const worstMetrics = scorecard.audiences.find((a) => a.personaId === scorecard.worstAudience);

  return {
    from: {
      personaId: fromAlloc.personaId,
      currentPercent: fromAlloc.percent,
      newPercent: fromAlloc.percent - shift,
    },
    to: {
      personaId: toAlloc.personaId,
      currentPercent: toAlloc.percent,
      newPercent: toAlloc.percent + shift,
    },
    shiftPercent: shift,
    reason: `Shifting ${shift}% from audience ${fromAlloc.personaId} (CPA ₹${((worstMetrics?.cpaPaise ?? 0) / 100).toFixed(0)}) to ${toAlloc.personaId} (CPA ₹${((bestMetrics?.cpaPaise ?? 0) / 100).toFixed(0)}) — ${((bestMetrics?.cpaPaise ?? 1) / (worstMetrics?.cpaPaise ?? 1) * 100).toFixed(0)}% lower CPA`,
  };
}

/**
 * Apply a reallocation proposal to produce new audience allocations.
 * PURE — returns a new array without mutating the input.
 */
export function applyReallocation(
  allocations: AudienceAllocation[],
  proposal: ReallocationProposal,
): AudienceAllocation[] {
  return allocations.map((a) => {
    if (a.personaId === proposal.from.personaId) {
      return { ...a, percent: proposal.from.newPercent, rationale: `Reduced: ${proposal.reason}` };
    }
    if (a.personaId === proposal.to.personaId) {
      return { ...a, percent: proposal.to.newPercent, rationale: `Increased: ${proposal.reason}` };
    }
    return a;
  });
}
