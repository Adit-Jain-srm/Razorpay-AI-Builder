/**
 * Payments barrel — client-safe exports (types + policy + HMAC + audit + growth).
 * Server-only modules (razorpay.ts, products.ts) must be imported by explicit path.
 */

export type {
  AuditAction,
  AuditEntry,
  CreateOrderInput,
  MandateActor,
  MandateDecider,
  MandateInput,
  MandateResult,
  MandateStatus,
  OrderResult,
  OrderStatus,
  PolicyDecision,
  ProductInfo,
  WebhookEvent,
} from "./types";

export {
  checkAll,
  checkCampaignBudget,
  checkCurrency,
  checkNoRetryAfterFailure,
  checkOrderAmount,
  checkOrderRate,
  checkReason,
  checkRemainingBudget,
  POLICY_DEFAULTS,
} from "./policy";

export { verifyCheckoutSignature, verifyWebhookSignature } from "./hmac";

export {
  writeAudit,
  getAuditTimeline,
  getFullAuditLog,
  countAuditEvents,
  clearAuditStore,
  auditActionLabel,
  isFailureAction,
  type AuditRecord,
} from "./audit";

export {
  buildGrowthScorecard,
  computeReallocation,
  applyReallocation,
  type AudienceMetrics,
  type GrowthScorecard,
  type ReallocationProposal,
} from "./growth";
