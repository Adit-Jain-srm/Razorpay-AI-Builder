# Gap Analysis — MediaOS vs Track 01

Current state as of Waves 0–6 (shipped, deployed at https://mediaos-kappa.vercel.app).

---

## Capability matrix

| Capability | Status | Evidence | Track 01 gap |
|------------|--------|----------|--------------|
| Audience intelligence (6 Bright Data providers) | **Have** | `src/lib/research/**`, [Docs/research-engine.md](../research-engine.md) | None |
| Campaign strategist (brief, platforms, budget) | **Have** | `src/lib/campaign/**`, [Docs/campaigns.md](../campaigns.md) | Plans spend; does not move money |
| Creative agent (copy, images, hooks, scoring) | **Have** | `src/lib/creative/**`, [Docs/creative-studio.md](../creative-studio.md) | No ad-platform publish |
| Landing generate/deploy/A/B | **Have** | `src/lib/landing/**`, [Docs/landing-pages.md](../landing-pages.md) | CTA is email (`lead_form`), not checkout |
| Operator (17 tools, 16-step budget) | **Have** | `src/lib/agent/**`, [Docs/operator-tools.md](../operator-tools.md) | Golden path ends at analytics; no money tools |
| Analytics | **Partial** | `src/lib/analytics/**`, [Docs/analytics.md](../analytics.md) | CTR/CPA seeded; funnel LP/leads modeled (`LP_VIEW_RATE=0.82`); recs are display-only |
| Razorpay Checkout / Orders / webhooks | **Missing** | Zero `razorpay` in `src/` | Entire money loop |
| Audit trail / explainable money | **Missing** | `agent_runs` stores tool JSON but no money ledger | No mandate, no policy, no audit UI |
| Agent-readable catalog | **Missing** | None | No product feed, no checkout sessions |
| Upsell / cross-sell | **Missing** | None | No product graph, no upsell tool |
| Currency | **USD default** | `budgetPlanSchema` in `src/lib/campaign/brief.ts` | Must be INR for Track 01 |
| Canonical demo | **US finance newsletter** | `DEMO_CAMPAIGN_NAME = "Retirement Income Weekly"` | Must add Indian D2C (AarogyaFit) |
| E2E tests | **Login only** | `e2e/golden-path.spec.ts` | Need checkout success/failure/audit |
| Docs/api.md | **Stale** | Lists `/api/lead` (not `/api/leads`) | Must fix + add checkout/commerce/webhook |

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
