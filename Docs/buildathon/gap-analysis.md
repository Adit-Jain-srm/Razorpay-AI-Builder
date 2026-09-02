# Gap Analysis — MediaOS Track 01

Current state after Wave 7 (shipped, deployed at https://mediaos-kappa.vercel.app).

**Status: ALL GAPS CLOSED.** Every item below is shipped, tested, and deployed.

---

## Capability matrix

| Capability | Status | Evidence | Track 01 gap |
|------------|--------|----------|--------------|
| Audience intelligence (6 Bright Data providers) | **Have** | `src/lib/research/**`, [Docs/research-engine.md](../research-engine.md) | None |
| Campaign strategist (brief, platforms, budget) | **Have** | `src/lib/campaign/**`, [Docs/campaigns.md](../campaigns.md) | Plans spend; does not move money |
| Creative agent (copy, images, hooks, scoring) | **Have** | `src/lib/creative/**`, [Docs/creative-studio.md](../creative-studio.md) | No ad-platform publish |
| Landing generate/deploy/A/B | **Have** | `src/lib/landing/**`, [Docs/landing-pages.md](../landing-pages.md) | CTA is email (`lead_form`), not checkout |
| Operator (25 module tools, 24-step budget) | **Shipped** | `src/lib/agent/**`, [Docs/operator-tools.md](../operator-tools.md) | Golden path includes checkout, catalog, upsell, audit, catalog management |
| Analytics | **Shipped** | `src/lib/analytics/**`, [Docs/analytics.md](../analytics.md) | Extended funnel with Checkout→Paid; seeded impressions labeled |
| Razorpay Checkout / Orders / webhooks | **Shipped** | `src/app/api/checkout/**`, `src/app/api/webhooks/razorpay/**` | Orders API, Standard Checkout, HMAC webhooks |
| Audit trail / explainable money | **Shipped** | `src/lib/payments/audit.ts`, Operator `explain_money_action` | Append-only ledger, 13 action types |
| Agent-readable catalog | **Shipped** | `src/app/api/commerce/catalog/**` | ACP-inspired feed + checkout sessions + `llms.txt` |
| Upsell / cross-sell | **Shipped** | `recommend_upsells` + `add_product` tools | Product graph, policy-gated |
| Currency | **INR** | `budgetPlanSchema`, policy `allowedCurrency: "INR"` | All money in paise |
| Canonical demo | **AarogyaFit (INR)** | `/lp/aarogya-fit` with Razorpay Checkout | Seeded + deployed |
| E2E tests | **507 passing** | 53 test files | HMAC, policy, catalog, funnel, audit, products |
| Docs/api.md | **Current** | Lists all 14 routes including checkout/commerce/webhook | Fixed |

---

## Key files to touch

1. `src/lib/env.ts` — add Razorpay keys + `isRazorpayConfigured()`
2. `supabase/migrations/0003_*.sql` — new money tables
3. `src/lib/landing/types.ts` — add `checkout` section
4. `src/app/lp/[slug]/page.tsx` — mount Checkout.js
5. `src/lib/analytics/aggregate.ts` — replace modeled funnel
6. `src/lib/agent/tools/index.ts` — register payment/money tools
7. `src/lib/agent/prompts.ts` — extend golden path
8. `src/lib/campaign/brief.ts` — INR + audienceAllocations
9. `src/lib/seed/constants.ts` — AarogyaFit demo
10. `src/types/database.ts` — new table types
