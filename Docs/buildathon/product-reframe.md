# Product Reframe — MediaOS for Track 01

---

## Positioning

**Before (Waves 0–6):** "An AI media buyer that researches audiences and creates ads."

**After (Wave 7):** "An autonomous merchant growth agent that researches Indian buyers, deploys
campaigns, exposes an agent-readable catalog, collects rupees through Razorpay test-mode Checkout,
upsells within a signed mandate, and optimizes toward a bounded ₹ objective — with an audit trail
on every money action."

---

## Demo merchant

Indian D2C digital + physical-adjacent: **AarogyaFit**.

| SKU | Product | Price | Role |
|-----|---------|-------|------|
| `AAROGYA-12W` | AarogyaFit 12-week training program | ₹1,499 (149900 paise) | Hero checkout |
| `AAROGYA-NUTR` | Nutrition add-on guide | ₹499 (49900 paise) | Upsell |
| `AAROGYA-BUNDLE` | Program + nutrition | ₹1,799 (179900 paise) | Cross-sell bundle |

"Retirement Income Weekly" stays as a second seeded campaign. AarogyaFit is the golden-path default.

---

## 5-minute pitch script

| Time | Beat | Show |
|------|------|------|
| 0:00–0:30 | **Problem.** Small Indian merchants have no media team and no agentic checkout. NPCI UAP, ACP, AP2, x402 are the 2026 protocol race; Razorpay test-mode is the rail. | Slide or narrated intro |
| 0:30–1:00 | **Solution.** MediaOS: research → orchestrate → catalog → Razorpay rupee → optimize, with mandates on every money action. | Architecture diagram |
| 1:00–2:30 | **Live demo.** Operator golden path: research → campaign → creatives → LP → deploy → pay ₹1,499 with test card → GMV ticks on Command Center. | Screen recording of live URL |
| 2:30–3:30 | **Architecture deep dive.** Typed tools → policy engine → mandate → Razorpay Orders API → webhook → audit. Show catalog JSON at `/api/commerce/catalog`. | Code + diagram |
| 3:30–4:30 | **Results.** Scorecard: audience A/B/C CTR/CVR/CPA. Agent reallocates C→B with reason. Trigger `failure@razorpay` → stop-rule → audit line. | Dashboard + audit timeline |
| 4:30–5:00 | **Why Razorpay.** "MediaOS doesn't just generate marketing. It closes the loop between acquisition and payment. The merchant is sellable to AI buyers." | Closing slide |

---

## Judge click-path (5 minutes, zero setup)

1. Open https://mediaos-kappa.vercel.app — Command Center shows AarogyaFit campaign + GMV card.
2. Click **Operator** → ask "Launch an AarogyaFit campaign targeting fitness-conscious 22–35 year olds".
3. Watch: research → campaign → creatives → landing page → checkout configured.
4. Open the deployed `/lp/aarogya-…` — click Pay — enter test card — success → thanks page.
5. Back to Command Center — GMV updated — click audit link — see `order_created` + `payment_captured`.
6. In Operator → trigger a failed payment (or navigate to `/lp/…` with `failure@razorpay` UPI) — see stop-rule in audit.
7. Open `/api/commerce/catalog` — valid JSON with INR items + `is_eligible_checkout`.
8. In Operator → "Reallocate budget from audience C to B" — see mandate + audit.
