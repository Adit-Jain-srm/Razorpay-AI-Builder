/**
 * Razorpay money-loop domain types. PURE + client-safe (no server imports).
 * Shared by the payments client, policy engine, audit, tools, and UI.
 */

/* -------------------------------------------------------------------------- */
/* Order                                                                      */
/* -------------------------------------------------------------------------- */

export type OrderStatus = "created" | "attempted" | "paid" | "failed" | "expired";

export interface CreateOrderInput {
  sku: string;
  campaignId?: string;
  landingPageId?: string;
  upsellSkus?: string[];
  utm?: Record<string, string>;
  idempotencyKey?: string;
  /** Actor that initiated the order. */
  actor: "buyer" | "operator";
}

export interface OrderResult {
  orderId: string;
  razorpayOrderId: string | null;
  amountPaise: number;
  currency: string;
  status: OrderStatus;
  receipt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Mandate (AP2-style bounds on money actions)                                */
/* -------------------------------------------------------------------------- */

export type MandateStatus = "active" | "consumed" | "denied" | "expired";
export type MandateActor = "operator" | "buyer" | "policy" | "webhook";
export type MandateDecider = "policy" | "user";

export interface MandateInput {
  action: string;
  amountPaise: number;
  maxPaise: number;
  currency?: string;
  expiresInMs?: number;
  reason: string;
  evidence?: string[];
  actor: MandateActor;
  campaignId?: string;
}

export interface MandateResult {
  id: string;
  status: MandateStatus;
  action: string;
  amountPaise: number;
  maxPaise: number;
  reason: string;
  expiresAt: string;
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

export type AuditAction =
  | "order_created"
  | "order_attempted"
  | "payment_captured"
  | "payment_failed"
  | "order_expired"
  | "mandate_created"
  | "mandate_denied"
  | "mandate_consumed"
  | "budget_reallocated"
  | "upsell_applied"
  | "upsell_rejected"
  | "campaign_activated"
  | "product_added"
  | "product_removed"
  | "signature_invalid";

export interface AuditEntry {
  actor: string;
  action: AuditAction;
  campaignId?: string;
  orderId?: string;
  mandateId?: string;
  reason: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ok: boolean;
  errorCode?: string;
}

/* -------------------------------------------------------------------------- */
/* Policy                                                                     */
/* -------------------------------------------------------------------------- */

export interface PolicyDecision {
  allowed: boolean;
  code?: string;
  reason: string;
}

/* -------------------------------------------------------------------------- */
/* Product (catalog)                                                          */
/* -------------------------------------------------------------------------- */

export interface ProductInfo {
  id: string;
  sku: string;
  title: string;
  description: string;
  amountPaise: number;
  currency: string;
  imageUrl?: string;
  availability: string;
  upsellSkus: string[];
  crossSellSkus: string[];
  isEligibleCheckout: boolean;
}

/* -------------------------------------------------------------------------- */
/* Webhook                                                                    */
/* -------------------------------------------------------------------------- */

export interface WebhookEvent {
  eventId: string;
  eventName: string;
  payload: Record<string, unknown>;
  createdAt: number;
}
