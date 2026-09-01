# Upgrade Spec — Implementation Contract for Wave 7

This is the technical contract that Phases 1–7 execute. For the full plan see the
[plan file](../../.cursor/plans/track_01_upgrade_96eff3ff.plan.md).

---

## Schema

New migration `supabase/migrations/0003_razorpay_money_loop.sql`. Do not edit frozen `0001` or
`0002`. Money columns: `bigint` paise. RLS: denormalized `user_id`, owner policy, public insert via
deployed-page join. `set_updated_at` trigger on every table.

### Tables

- **`products`** — sku, title, description, `amount_paise`, currency, image, availability, upsell/cross-sell graph, sort_order.
- **`orders`** — campaign_id, landing_page_id, product_id, razorpay_order_id, receipt, `amount_paise`, status (`created|attempted|paid|failed|expired`), mandate_id, utm, idempotency_key.
- **`order_items`** — sku, qty, `amount_paise`, role (`primary|upsell|cross_sell`).
- **`payments`** — razorpay_payment_id, order_id, status, method, error_code/description, redacted payload.
- **`mandates`** — action, amountPaise, maxPaise, expiresAt, reason, evidence, decidedBy, status.
- **`audit_events`** — actor, action, campaign_id, order_id, mandate_id, reason, before/after jsonb, ok, error_code. Append-only.
- **`webhook_receipts`** — event_id (unique), event_name, signature_ok, processed_at, raw_hash.

### Access patterns (index each)

1. `audit_events WHERE campaign_id = ? ORDER BY created_at DESC`
2. `webhook_receipts WHERE event_id = ?`
3. `orders WHERE razorpay_order_id = ?`
4. `orders WHERE campaign_id = ? AND status = 'paid'` (GMV)
5. `payments WHERE order_id = ?`
6. `products WHERE status = 'active' ORDER BY sort_order`
7. `mandates WHERE campaign_id = ? AND status = 'active' AND expires_at > now()`
8. `orders WHERE status = 'created' AND created_at < now() - interval '30 minutes'` (abandoned)

---

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/checkout/orders` | POST | Create Razorpay order (server-priced) |
| `/api/checkout/verify` | POST | Verify checkout handler signature |
| `/api/webhooks/razorpay` | POST | `payment.captured`, `payment.failed`, `order.paid` |
| `/api/commerce/catalog` | GET | ACP-inspired product feed (public) |
| `/api/commerce/checkout/sessions` | POST | Create checkout session |
| `/api/commerce/checkout/sessions/:id` | GET | Get session |
| `/api/commerce/checkout/sessions/:id/complete` | POST | Complete session |
| `/api/commerce/chat` | POST | Conversational checkout (rate-limited) |

---

## Operator tools (new)

| Tool | Category | Writes |
|------|----------|--------|
| `create_checkout_session` | payments | orders + mandate + audit |
| `list_catalog` | commerce | read-only |
| `recommend_upsells` | commerce | read-only |
| `explain_money_action` | audit | read-only |
| `reallocate_budget` | campaign | campaigns.budget jsonb + audit |
| `apply_recommendation` | campaign | scale/pause/refresh with mandate |
| `get_growth_scorecard` | analytics | read-only |

Golden path extended: research → campaign → creatives → LP → catalog → upsell → checkout → scorecard → reallocate. Step budget: 24.

---

## Policy engine

Deterministic, not LLM. LLM proposes; policy gates.

| Rule | Default |
|------|---------|
| Currency | INR only |
| Max single order | ₹5,000 (500000 paise) |
| Max campaign budget | ₹50,000 |
| Rate limit | 20 agent orders / 10 min / campaign |
| Reason min | 24 chars |
| Same-order retry after fail | Forbidden |

---

## Tests

**Unit:** policy matrix, dual HMAC, webhook idempotency, amount tamper, stop-rule, catalog schema,
funnel monotonic, audience allocations, demo seed ids, env predicates, `runToolSafely`.

**E2E:** login, catalog, checkout success, checkout failure, audit trail, golden-path surfaces.

**Smoke:** `scripts/smoke-razorpay.mjs` (creds-gated).
