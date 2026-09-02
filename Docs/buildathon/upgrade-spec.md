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

## Operator tools (shipped)

| Tool | Category | Writes |
|------|----------|--------|
| `create_checkout_session` | commerce | orders + mandate + audit (auto-creates product if not in catalog) |
| `list_catalog` | commerce | read-only |
| `recommend_upsells` | commerce | read-only |
| `add_product` | commerce | catalog (mutable) + audit |
| `remove_product` | commerce | catalog (mutable) + audit |
| `explain_money_action` | payments | read-only |
| `reallocate_budget` | payments | campaigns.budget jsonb + audit |
| `get_growth_scorecard` | payments | read-only |

Golden path: research → campaign → creatives → LP → deploy → **auto-checkout** → catalog → upsell → scorecard → reallocate → audit. Step budget: 24. Total: 25 module + 3 built-in = 28 tools.

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

## Tests (507 passing, 53 files)

**Unit:** policy matrix (8 checks), dual HMAC (checkout + webhook with timingSafeEqual), webhook
idempotency + stale event, amount tamper, stop-rule, catalog schema (9 tests), product catalog (8
tests), growth scorecard (13 tests), audit service (8 tests), extended funnel (6 tests), audience
allocations, demo seed ids, env predicates (6 Razorpay tests), `runToolSafely` on all tools.

**Smoke:** `scripts/smoke-razorpay.mjs` (creds-gated, creates live test-mode order).
