/**
 * Deterministic policy engine for money actions.
 *
 * LLM proposes; policy gates. Every call writes to audit_events (allowed or denied).
 * Rules are configurable constants, not LLM output.
 */

import type { PolicyDecision } from "./types";

/* -------------------------------------------------------------------------- */
/* Configurable policy constants                                              */
/* -------------------------------------------------------------------------- */

export const POLICY_DEFAULTS = {
  /** Maximum single order in paise (₹5,000 = 500000 paise). */
  maxOrderPaise: 500_000,
  /** Maximum campaign budget in paise (₹50,000 = 5000000 paise). */
  maxCampaignBudgetPaise: 5_000_000,
  /** Only this currency for Razorpay orders. */
  allowedCurrency: "INR" as const,
  /** Minimum reason length for audit trail. */
  minReasonLength: 24,
  /** Maximum agent-initiated orders per window per campaign. */
  maxOrdersPerWindow: 20,
  /** Window size in ms for rate limiting (10 minutes). */
  orderWindowMs: 10 * 60 * 1000,
} as const;

export type PolicyConfig = typeof POLICY_DEFAULTS;

/* -------------------------------------------------------------------------- */
/* Policy checks (each returns a decision; compose them with `checkAll`)      */
/* -------------------------------------------------------------------------- */

export function checkCurrency(currency: string, config: PolicyConfig = POLICY_DEFAULTS): PolicyDecision {
  if (currency !== config.allowedCurrency) {
    return { allowed: false, code: "POLICY_DENIED", reason: `Currency must be ${config.allowedCurrency}, got ${currency}` };
  }
  return { allowed: true, reason: "Currency OK" };
}

export function checkOrderAmount(amountPaise: number, config: PolicyConfig = POLICY_DEFAULTS): PolicyDecision {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return { allowed: false, code: "POLICY_DENIED", reason: `Amount must be a positive integer (paise), got ${amountPaise}` };
  }
  if (amountPaise > config.maxOrderPaise) {
    return { allowed: false, code: "POLICY_DENIED", reason: `Order ₹${amountPaise / 100} exceeds max ₹${config.maxOrderPaise / 100}` };
  }
  return { allowed: true, reason: "Order amount within cap" };
}

export function checkCampaignBudget(
  budgetTotalPaise: number,
  config: PolicyConfig = POLICY_DEFAULTS,
): PolicyDecision {
  if (budgetTotalPaise > config.maxCampaignBudgetPaise) {
    return { allowed: false, code: "POLICY_DENIED", reason: `Campaign budget ₹${budgetTotalPaise / 100} exceeds max ₹${config.maxCampaignBudgetPaise / 100}` };
  }
  return { allowed: true, reason: "Campaign budget within cap" };
}

export function checkReason(reason: string, config: PolicyConfig = POLICY_DEFAULTS): PolicyDecision {
  if (!reason || reason.trim().length < config.minReasonLength) {
    return {
      allowed: false,
      code: "POLICY_DENIED",
      reason: `Reason must be at least ${config.minReasonLength} chars, got ${reason?.trim().length ?? 0}`,
    };
  }
  return { allowed: true, reason: "Reason meets minimum length" };
}

export function checkRemainingBudget(
  orderAmountPaise: number,
  spentPaise: number,
  budgetTotalPaise: number,
): PolicyDecision {
  const remaining = budgetTotalPaise - spentPaise;
  if (orderAmountPaise > remaining) {
    return {
      allowed: false,
      code: "POLICY_DENIED",
      reason: `Order ₹${orderAmountPaise / 100} exceeds remaining budget ₹${remaining / 100} (spent ₹${spentPaise / 100} of ₹${budgetTotalPaise / 100})`,
    };
  }
  return { allowed: true, reason: "Within remaining budget" };
}

/**
 * Stop-rule: forbid retrying a payment on the same Razorpay order after failure.
 * A failed payment must create a NEW order, not retry the same one.
 */
export function checkNoRetryAfterFailure(
  razorpayOrderId: string | null,
  failedOrderIds: ReadonlySet<string>,
): PolicyDecision {
  if (razorpayOrderId && failedOrderIds.has(razorpayOrderId)) {
    return {
      allowed: false,
      code: "PAYMENT_FAILED",
      reason: `Order ${razorpayOrderId} already failed — create a new order instead of retrying`,
    };
  }
  return { allowed: true, reason: "No prior failure on this order" };
}

export function checkOrderRate(
  recentOrderCount: number,
  config: PolicyConfig = POLICY_DEFAULTS,
): PolicyDecision {
  if (recentOrderCount >= config.maxOrdersPerWindow) {
    return {
      allowed: false,
      code: "POLICY_DENIED",
      reason: `Rate limit: ${recentOrderCount} orders in the last ${config.orderWindowMs / 60000} minutes (max ${config.maxOrdersPerWindow})`,
    };
  }
  return { allowed: true, reason: "Within rate limit" };
}

/* -------------------------------------------------------------------------- */
/* Compose: run all applicable checks, fail on first denial                   */
/* -------------------------------------------------------------------------- */

export function checkAll(...decisions: PolicyDecision[]): PolicyDecision {
  for (const d of decisions) {
    if (!d.allowed) return d;
  }
  return { allowed: true, reason: "All policy checks passed" };
}
