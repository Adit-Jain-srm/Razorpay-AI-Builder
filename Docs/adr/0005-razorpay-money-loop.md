# ADR 0005: Razorpay Money Loop (Track 01)

- **Status:** Accepted
- **Date:** 2026-09-01 (proposed), 2026-09-02 (accepted after Phase 7 implementation)
- **Deciders:** Wave 7 build (Razorpay AI Buildathon Track 01)

## Context

MediaOS Waves 0–6 built a complete research-to-landing pipeline but stopped at email lead capture.
Track 01 of the Razorpay AI Buildathon requires: (1) an agent that grows merchant revenue on
Razorpay test-mode APIs, and (2) a merchant transactable by an AI buyer end to end. The bar is
"every money action explainable, bounded and gated; show the audit trail and one failure handled
gracefully."

The existing architecture has no payment tables, no Razorpay integration, no policy engine, no
audit ledger, and no agent-readable catalog. Currency defaults to USD. The analytics funnel uses
modeled ratios rather than real conversion data.

## Decision

### Add a Razorpay test-mode money loop

Seven new tables (`products`, `orders`, `order_items`, `payments`, `mandates`, `audit_events`,
`webhook_receipts`) in a new migration `0003_razorpay_money_loop.sql`. All money columns are
`bigint` paise (never float). RLS follows the existing ADR 0003 patterns: owner-scoped `user_id`,
public order insert only via deployed-page join, webhook writes via service role.

### Deterministic policy engine gates every money action

LLM proposes; a pure, deterministic policy module decides. Policy enforces: INR-only, max single
order ₹5,000, max campaign budget ₹50,000, rate limit 20 agent orders per 10 minutes, reason
minimum 24 chars, remaining budget check, and a stop-rule that forbids retrying a failed payment
on the same `razorpay_order_id`.

### AP2-style mandates

Every money action requires a persisted mandate before execution: `{ action, amountPaise, maxPaise,
expiresAt, reason, evidence[], decidedBy: "policy"|"user", status }`. This is inspired by Google
AP2 mandates but uses Razorpay as the payment rail.

### Razorpay Standard Checkout on landing pages

A new `checkout` section type in the landing document union. The public `/lp/[slug]` page loads
Checkout.js from the Razorpay CDN. The client never sets the amount — server resolves product prices
from the `products` table. Two HMAC verification paths: checkout handler (`KEY_SECRET` over
`order_id|payment_id`) and webhook (`WEBHOOK_SECRET` over raw body). Fulfill only on webhook
`payment.captured` / `order.paid`, not on the handler alone.

### ACP-inspired catalog and checkout sessions

A public `GET /api/commerce/catalog` returns a JSON feed with ACP-inspired fields
(`is_eligible_search`, `is_eligible_checkout`, SKU prices in paise). Checkout sessions
(`POST /api/commerce/checkout/sessions`) let an AI buyer create an order programmatically.
`llms.txt` and optional JSON-LD advertise the catalog to agents.

### Upsell / cross-sell + executable reallocations

Products carry `upsell_skus` and `cross_sell_skus`. A `recommend_upsells` tool proposes add-ons
with evidence. `reallocate_budget` and `apply_recommendation` tools write campaign budget jsonb
and create mandates + audit events (today these are display-only recommendations).

### Real analytics funnel

Replace the modeled `LP_VIEW_RATE` and `CONVERSION_OF_LEAD` constants with real joins to
`page_views` and `orders`. Add funnel stages: Checkout Started (orders created) → Paid (payments
captured) → GMV. Label simulated impressions/clicks honestly.

### Env, errors, graceful degradation

Three new env vars (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`)
with `isRazorpayConfigured()`. App boots without keys (in-memory payment store, like Azure
degradation). New error codes: `POLICY_DENIED`, `SIGNATURE_INVALID`, `PAYMENT_FAILED`.

### Operator golden path extended

17 → 24+ tools. Step budget 16 → 24. Golden path: research → campaign → creatives → LP → catalog →
upsell → checkout → scorecard → reallocate. Demo mode includes the checkout path.

## Consequences

- **Positive:** MediaOS becomes a complete Track 01 submission covering all four example directions
  (campaign orchestrator, conversational checkout, agent-readable catalog, upsell). The audit trail
  and failure handling are first-class, not bolted on. Real GMV replaces modeled conversions.
- **Negative:** Seven new tables and four API routes increase the surface area. The policy engine
  is intentionally rigid (deterministic, not LLM) which limits flexibility but satisfies the
  "bounded and gated" bar. Test-mode only means no real money flows.
