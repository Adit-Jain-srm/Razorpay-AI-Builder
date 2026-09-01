# Payments & Commerce (Wave 7 — Track 01)

The money loop that connects MediaOS campaigns to Razorpay test-mode revenue. Every money action
is explainable, bounded, gated by a deterministic policy engine, and logged to an append-only
audit trail — the Track 01 bar.

Cross-references: [architecture](./architecture.md), [campaigns](./campaigns.md),
[landing-pages](./landing-pages.md), [analytics](./analytics.md),
[ADR 0005](./adr/0005-razorpay-money-loop.md), [operator-tools](./operator-tools.md),
[progress](./progress.md), [protocols](./buildathon/protocols.md).

---

## 1. Module map

| Area | Path | Notes |
|---|---|---|
| Domain types (pure) | `src/lib/payments/types.ts` | OrderStatus, MandateInput, AuditEntry, PolicyDecision, ProductInfo, WebhookEvent |
| Policy engine (pure) | `src/lib/payments/policy.ts` | 8 deterministic checks + composable `checkAll` |
| HMAC verification | `src/lib/payments/hmac.ts` | Checkout handler + webhook (two distinct secrets) |
| Razorpay HTTP client | `src/lib/payments/razorpay.ts` | fetch + Basic auth, `withRetry`/`withTimeout`, server-only |
| Audit service | `src/lib/payments/audit.ts` | In-memory append-only ledger (capped 10K), labels, failure classification |
| Growth scorecard | `src/lib/payments/growth.ts` | Per-audience CPA ranking, reallocation proposals |
| Product catalog | `src/lib/payments/products.ts` | Shared SKU definitions (AarogyaFit) |
| Barrel (client-safe) | `src/lib/payments/index.ts` | Re-exports types + policy + HMAC (no server imports) |
| Operator tools | `src/lib/agent/tools/payments.tools.ts` | 5 tools: reallocate_budget, get_growth_scorecard, explain_money_action, list_catalog, recommend_upsells |

## 2. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/checkout/orders` | POST | Create Razorpay order (server-priced SKU, demo fallback) |
| `/api/checkout/verify` | POST | Verify checkout handler HMAC signature |
| `/api/webhooks/razorpay` | POST | `payment.captured`, `payment.failed`, `order.paid` — raw body HMAC, idempotent, replay guard |
| `/api/commerce/catalog` | GET | ACP-inspired product feed (public, cached) |
| `/api/commerce/checkout/sessions` | POST/GET | Create or list checkout sessions |

All routes use `runtime = "nodejs"`. Webhook returns HTTP 200 within 5 seconds.

## 3. Policy engine

Deterministic, not LLM. The LLM proposes; policy gates. Every gated call writes to `audit_events`.

| Rule | Default |
|---|---|
| Currency | INR only |
| Max single order | ₹5,000 (500,000 paise) |
| Max campaign budget | ₹50,000 (5,000,000 paise) |
| Agent rate limit | 20 orders / 10 min / campaign |
| Reason minimum | 24 characters |
| Remaining budget | Order cannot exceed `budget.total - spent` |
| Stop-rule | No retry on a failed `razorpay_order_id` |

## 4. HMAC verification

Two distinct secrets and message formats:

**Checkout handler** — `HMAC-SHA256(key = RAZORPAY_KEY_SECRET, msg = order_id|payment_id)`.
Compared with `crypto.timingSafeEqual`.

**Webhook** — `HMAC-SHA256(key = RAZORPAY_WEBHOOK_SECRET, msg = RAW body bytes)`. The raw body
must never be re-serialized (`JSON.stringify(parsed)` changes key order and breaks the HMAC).

## 5. Audit trail

Append-only in-memory store (capped at 10K records). Every money action — whether allowed or
denied — is logged with: actor, action, campaignId, orderId, mandateId, reason, before/after
state, ok/errorCode, timestamp.

Actions: `order_created`, `payment_captured`, `payment_failed`, `order_expired`,
`mandate_created`, `mandate_denied`, `budget_reallocated`, `upsell_applied`, `upsell_rejected`,
`campaign_activated`, `signature_invalid`.

## 6. Product catalog (AarogyaFit)

| SKU | Product | Price | Role |
|-----|---------|-------|------|
| `AAROGYA-12W` | 12-week training program | ₹1,499 | Hero |
| `AAROGYA-NUTR` | Nutrition add-on guide | ₹499 | Upsell |
| `AAROGYA-BUNDLE` | Program + nutrition | ₹1,799 | Cross-sell bundle |

Products are server-priced — the client sends a SKU, not an amount. The catalog feed at
`/api/commerce/catalog` is ACP-inspired with `is_eligible_checkout` and upsell/cross-sell graph.

## 7. Schema (migration 0003)

7 new tables in `supabase/migrations/0003_razorpay_money_loop.sql`: `products`, `orders`,
`order_items`, `payments`, `mandates`, `audit_events`, `webhook_receipts`. All money columns are
`bigint` paise. RLS follows ADR 0003 patterns: owner-scoped `user_id`, public order insert via
deployed-page join, webhook writes via service role.

## 8. Degradation

App boots without Razorpay keys: in-memory demo orders, `isRazorpayConfigured()` returns false,
checkout button shows demo mode, Operator tools use seeded scorecard data.

## 9. Testing

38 HMAC + policy unit tests. 9 catalog schema tests. 13 growth scorecard tests. 8 audit tests.
6 extended funnel tests. All CI-safe (no network). Smoke: `npm run smoke:razorpay` (creds-gated).

## 10. References

- [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Test cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Test UPI](https://razorpay.com/docs/payments/payments/test-upi-details/)
