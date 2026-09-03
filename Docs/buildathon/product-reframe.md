# Product Reframe — MediaOS for Track 01

---

## Positioning

**Before (Waves 0-6):** "An AI media buyer that researches audiences and creates ads."

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

## Video script (screen-by-screen)

Format: screen recording with voiceover narration. ~130 words/minute speaking pace.
Target length: ~7 minutes.

---

### Beat 1 — HOOK (0:00-0:30)

**Screen:** Browser tab open to `mediaos-kappa.vercel.app`. Command Center visible.

**Say:**
"Small Indian merchants have no media team, no agentic checkout, and no way to make their products sellable to AI buyers. 2026 is the year of the protocol race — NPCI is building the Unified Agent Protocol for UPI, OpenAI and Stripe launched the Agentic Commerce Protocol, Google has AP2, Coinbase has x402. Merchants need a tool to participate. I built one. This is MediaOS — an autonomous AI growth agent that closes the loop from audience research to Razorpay rupee, with a policy engine and audit trail on every money action."

**Track 01 bar:** Problem taste.

---

### Beat 2 — SOLUTION + ARCHITECTURE (0:30-0:50)

**Screen:** Show the architecture diagram from the README (scroll to the Mermaid diagram). Highlight: Operator (25 tools) → Policy Engine → Razorpay Test Mode → Audit Trail.

**Say:**
"MediaOS is a Next.js 16 app with 25 typed agent tools, a deterministic policy engine that gates every money action, Razorpay test-mode Standard Checkout, dual HMAC verification, and an append-only audit trail. The AI proposes. The policy decides. The audit proves it. Let me show you everything."

**Track 01 bar:** Build quality.

---

### Beat 3 — COMMAND CENTER (0:50-1:30)

**Screen:** `mediaos-kappa.vercel.app/` — the Command Center.

**Walk through:**
1. Point to the **Morning Brief** card — anomaly detection + recommended actions.
2. Point to the **StatsGrid** — impressions, clicks, conversions, spend with animated counters.
3. Point to the **Quick Actions** — Open the Operator, Run Audience Research.
4. Point to the **Campaign Card** — links to Research, Creatives, Landing Pages, Analytics.

**Say:**
"The Command Center is the merchant's cockpit. Morning Brief tells you what happened overnight — it runs z-score anomaly detection and surfaces the top recommended actions. Stats show the pulse. Quick actions get you into the agent or the research engine. Every module is one click away."

**Track 01 bar:** Build quality.

---

### Beat 4 — OPERATOR CAPABILITIES (1:30-2:00)

**Screen:** Navigate to `/operator`. Type the prompt.

**Prompt to type:** "What can you do right now, and what is coming soon?"

**Walk through:**
1. The Operator responds with a structured list of all 25 capabilities across 7 categories: **research** (research_audience, get_personas), **campaign** (create_campaign, recommend_platforms, suggest_budget, list_campaigns, get_campaign), **creative** (generate_creatives, score_creative, regenerate_creative), **landing** (build_landing_page, deploy_landing_page), **analytics** (get_performance_summary, detect_anomalies, get_recommendations, daily_brief, proactive_briefing), **payments** (reallocate_budget, get_growth_scorecard, explain_money_action), **commerce** (create_checkout_session, list_catalog, recommend_upsells, add_product, remove_product).
2. Let the list render fully so judges can see the breadth.

**Say:**
"Twenty-five tools across seven modules. Research, campaigns, creatives, landing pages, analytics, payments, and commerce. Every one is Zod-validated, fail-safe, and returns typed artifacts. This isn't a wrapper around a chat API — it's a real tool-calling agent with a plan-execute-observe loop."

**Track 01 bar:** Build quality (25 typed tools, not a chatbot).

---

### Beat 5 — RESEARCH ENGINE (2:00-2:30)

**Screen:** Navigate to `/research`. Click into the seeded research project.

**Walk through:**
1. Show the **Research Workspace** — persona cards, pain points with real quotes, competitor ad angles, source citations.
2. Point to the **6 Bright Data providers** — search intent, communities, competitor ads, news, social, web intelligence.
3. Point to **source citations** — every claim is cited from live web data.

**Say:**
"The research engine is the moat. Six Bright Data providers run in parallel — search intent, community discussions, competitor ads, news, social signals, and web intelligence. The output is synthesized into cited personas, ranked pain points in the audience's own words, and competitor angles. This grounds everything downstream."

**Track 01 bar:** AI judgment.

---

### Beat 6 — CAMPAIGNS + CREATIVES (2:30-3:00)

**Screen:** Navigate to `/campaigns` → click the demo campaign. Then navigate to `/creatives`.

**Walk through:**
1. **Campaign Hub** — brief with objective, value props, audience personas, platform split, INR budget.
2. **Creative Studio** — platform-specific ad variants (Meta, Google, TikTok), scored 0-100 for direct-response quality.
3. **Hook classification** — fear, curiosity, FOMO, social proof, urgency, exclusivity.
4. **Regenerate** — one-click regeneration for low scorers.

**Say:**
"Campaigns link research to execution. The creative studio generates platform-ready ad variants, each classified by psychological hook and scored for direct-response quality. Low scorers get regenerated. The Operator can do all of this autonomously."

**Track 01 bar:** Build quality.

---

### Beat 7 — LANDING PAGES + EDITOR (3:00-3:40)

**Screen:** Navigate to `/landing-pages`. Click into a page to show the editor.

**Walk through:**
1. **Landing Manager** — three seeded pages: AarogyaFit with checkout, two retirement A/B variants. Five templates.
2. **Editor** — live preview of 14 section types: hero, rich text, features, social proof, testimonials, listicle, FAQ, countdown, quiz, lead form, exit intent, CTA, checkout, compliance.
3. **A/B testing** — weighted traffic splits. Retirement campaign has two variants.
4. **Checkout section** — Razorpay Checkout baked in by default, SKU resolved from catalog.

**Say:**
"The landing page engine has 14 section types, five templates, built-in A/B testing, and Razorpay Checkout baked into every generated page. This is what the buyer sees and pays on. Let me show you the Operator building one from scratch."

**Track 01 bar:** Build quality.

---

### Beat 8 — OPERATOR GOLDEN PATH (3:40-4:30)

**Screen:** Back to `/operator`. Type the prompt.

**Prompt to type:**
"Launch an AarogyaFit campaign targeting fitness-conscious 22-35 year olds in India. Research the audience, create Meta creatives, build and deploy a landing page with Razorpay checkout."

**Walk through:**
1. Agent creates a **plan** — visible steps in the chat.
2. Tools fire in sequence: `research_audience` → `create_campaign` → `generate_creatives` → `build_landing_page` → `deploy_landing_page` → `create_checkout_session`.
3. Artifacts appear: research report, campaign, creative set, landing page card, checkout session with payment link.
4. Agent returns a checkout URL.

**Say:**
"One prompt. The Operator researches the audience, creates the campaign, generates creatives, builds a landing page, deploys it live, and sets up Razorpay checkout. Every tool streams live. The golden path runs end to end — from research to payment-ready in one conversation."

**Fallback:** If Azure is slow, navigate directly to `/lp/aarogya-fit` and say "Let me show the seeded AarogyaFit page the Operator generated."

**Track 01 bar:** All.

---

### Beat 9 — LIVE PAYMENT (4:30-5:00)

**Screen:** Open the deployed landing page (from the Operator result, or `/lp/aarogya-fit`).

**Walk through:**
1. Scroll the page — hero, features, social proof, testimonials, FAQ.
2. Scroll to the **checkout section** — order summary, price ₹1,499, trust signals.
3. Click **Pay** — Razorpay modal opens with prefilled test data.
4. Enter test card `4111 1111 1111 1111`, any expiry, any CVV.
5. Payment succeeds → redirected to thanks page.
6. Show the **thanks page** — order receipt with product, order ID, Razorpay IDs, payment ID, amount, status, timestamp, plus simulated email confirmation.

**Say:**
"Real Razorpay Standard Checkout on a deployed page. Server-priced — the client never sets the amount. Dual HMAC-verified. The thanks page pulls real order data from the server store — product, IDs, amount, status, and a receipt email simulation. This is a real payment loop, not a mock."

**Track 01 bar:** Bounded + gated.

---

### Beat 10 — FAILURE DEMO (5:00-5:30)

**Screen:** Go back to the landing page. Click Pay again.

**Walk through:**
1. In the Razorpay modal, use UPI `failure@razorpay` or select Failure in the mock bank.
2. Payment fails → redirected to failed page.
3. Show the **failed page** — stop-rule message, Track 01 compliance card with ShieldWarning.

**Say:**
"Payment failed. The system enforces a stop-rule — the failed order is logged, and the policy engine will not retry it. A new checkout creates a new order with a fresh mandate. This is the Track 01 bar: graceful failure handling. Every failure is auditable."

**Track 01 bar:** Failure handled gracefully.

---

### Beat 11 — CATALOG API (5:30-5:50)

**Screen:** Open `mediaos-kappa.vercel.app/api/commerce/catalog` in a new tab.

**Walk through:**
1. Show the JSON — three products, INR, `is_eligible_checkout: true`, upsell/cross-sell graphs, checkout endpoints.
2. Point to `create_order` and `create_session` — programmatic purchase paths.

**Say:**
"The catalog is machine-readable — inspired by OpenAI's Agentic Commerce Protocol. Products, prices in paise, availability, upsell graph, and checkout endpoints. An AI buyer can discover products and transact programmatically. That's the second Track 01 clause — making the merchant transactable by AI buyers."

**Track 01 bar:** Agent-readable catalog.

---

### Beat 12 — SCORECARD + REALLOCATION (5:50-6:15)

**Screen:** Back to `/operator`.

**Prompt 1:** "Show the growth scorecard"
**Prompt 2:** "Shift 15% budget from audience C to B — C has 2x higher CPA"

**Walk through:**
1. **Growth scorecard** — per-audience CTR, CVR, CPA, GMV, orders, spend. Audience B wins.
2. **Reallocation** — policy checks currency, reason, mandate. Allowed. Audit event written.

**Say:**
"The Operator optimizes. Growth scorecard shows per-audience performance. Budget reallocation is policy-gated — the LLM proposes, the deterministic engine decides, and the mandate is logged. Every reallocation is explainable, bounded, and audited."

**Track 01 bar:** Explainable + bounded + gated.

---

### Beat 13 — AUDIT TRAIL (6:15-6:40)

**Screen:** Still in the Operator.

**Prompt:** "Show the full audit trail for this campaign"

**Walk through:**
1. Audit timeline — order_created, payment_captured, payment_failed, budget_reallocated, product_added, mandate_denied. All with timestamp, actor, reason, outcome.
2. Point to a denied mandate and a failed payment stop-rule.

**Say:**
"This is the audit trail. Every money action logged — who did it, why, and what happened. Allowed or denied. Captured or failed. Fifteen action types. The judge doesn't need to replay the conversation — they can read the ledger."

**Track 01 bar:** Audit trail shown.

---

### Beat 14 — ANALYTICS (6:40-7:00)

**Screen:** Navigate to `/analytics` → click into the campaign.

**Walk through:**
1. Portfolio overview — total spend, conversions, ROAS.
2. Campaign funnel — Impressions → Clicks → LP Views → Checkout Started → Paid.
3. Anomaly detection — z-score analysis, CPA spike flagged.
4. AI daily brief — one-paragraph summary with recommended next action.

**Say:**
"Analytics closes the feedback loop. The funnel tracks from impressions to Razorpay-paid orders. Anomaly detection flags spikes. The AI daily brief synthesizes everything. And the recommendations feed right back into the Operator."

**Track 01 bar:** Build quality.

---

### Beat 15 — CLOSE: README + DOCS (7:00-7:30)

**Screen:** Open the GitHub repo `github.com/Adit-Jain-srm/Razorpay-AI-Builder`. Scroll the README slowly.

**Walk through:**
1. Point to the **Track 01 Bar Compliance** table — explainable, bounded, gated, audit, failure.
2. Point to the **Architecture** mermaid diagram.
3. Point to the **Documentation** table — highlight key docs:
   - `Docs/payments.md` — Razorpay integration, policy engine, HMAC, audit trail
   - `Docs/operator-tools.md` — 25-tool catalog with golden path
   - `Docs/buildathon/track-01-bar.md` — money-action taxonomy, failure matrix
   - `Docs/buildathon/protocols.md` — UAP, ACP, AP2, x402 context
   - `Docs/architecture.md` — system diagrams, data model
4. Point to the **Testing** section — 507 tests, 0 errors.
5. Scroll to **What broke and how it was fixed** — "The full postmortem is here in the README for you to read."

**Say:**
"Everything is documented. The README has Track 01 compliance, architecture, and a full postmortem. The Docs folder has deep dives on payments, the operator's 25 tools, the protocol context, and the failure matrix. 507 tests. Zero type errors. The repo is the submission — judges, dig in.

MediaOS doesn't just generate marketing. It closes the loop between acquisition and payment. The merchant is transactable — by humans and by AI buyers. Built on Razorpay. Thank you."

**Track 01 bar:** All (closing statement ties everything together).

---

## Pure script (voiceover only)

Copy this section into your teleprompter or read it while recording. No stage directions — just what to say.

---

Small Indian merchants have no media team, no agentic checkout, and no way to make their products sellable to AI buyers. 2026 is the year of the protocol race — NPCI is building the Unified Agent Protocol for UPI, OpenAI and Stripe launched the Agentic Commerce Protocol, Google has AP2, Coinbase has x402. Merchants need a tool to participate. I built one. This is MediaOS — an autonomous AI growth agent that closes the loop from audience research to Razorpay rupee, with a policy engine and audit trail on every money action.

MediaOS is a Next.js 16 app with 25 typed agent tools, a deterministic policy engine that gates every money action, Razorpay test-mode Standard Checkout, dual HMAC verification, and an append-only audit trail. The AI proposes. The policy decides. The audit proves it. Let me show you everything.

The Command Center is the merchant's cockpit. Morning Brief tells you what happened overnight — it runs z-score anomaly detection and surfaces the top recommended actions. Stats show the pulse. Quick actions get you into the agent or the research engine. Every module is one click away.

Let me show you what the Operator can do. Twenty-five tools across seven modules. Research, campaigns, creatives, landing pages, analytics, payments, and commerce. Every one is Zod-validated, fail-safe, and returns typed artifacts. This isn't a wrapper around a chat API — it's a real tool-calling agent with a plan-execute-observe loop.

The research engine is the moat. Six Bright Data providers run in parallel — search intent, community discussions, competitor ads, news, social signals, and web intelligence. The output is synthesized into cited personas, ranked pain points in the audience's own words, and competitor angles. This grounds everything downstream.

Campaigns link research to execution. The creative studio generates platform-ready ad variants, each classified by psychological hook and scored for direct-response quality. Low scorers get regenerated. The Operator can do all of this autonomously.

The landing page engine has 14 section types, five templates, built-in A/B testing, and Razorpay Checkout baked into every generated page. This is what the buyer sees and pays on. Let me show you the Operator building one from scratch.

One prompt. The Operator researches the audience, creates the campaign, generates creatives, builds a landing page, deploys it live, and sets up Razorpay checkout. Every tool streams live. The golden path runs end to end — from research to payment-ready in one conversation.

Real Razorpay Standard Checkout on a deployed page. Server-priced — the client never sets the amount. Dual HMAC-verified. The thanks page pulls real order data from the server store — product, IDs, amount, status, and a receipt email simulation. This is a real payment loop, not a mock.

Payment failed. The system enforces a stop-rule — the failed order is logged, and the policy engine will not retry it. A new checkout creates a new order with a fresh mandate. This is the Track 01 bar: graceful failure handling. Every failure is auditable.

The catalog is machine-readable — inspired by OpenAI's Agentic Commerce Protocol. Products, prices in paise, availability, upsell graph, and checkout endpoints. An AI buyer can discover products and transact programmatically. That's the second Track 01 clause — making the merchant transactable by AI buyers.

The Operator optimizes. Growth scorecard shows per-audience performance. Budget reallocation is policy-gated — the LLM proposes, the deterministic engine decides, and the mandate is logged. Every reallocation is explainable, bounded, and audited.

This is the audit trail. Every money action logged — who did it, why, and what happened. Allowed or denied. Captured or failed. Fifteen action types. The judge doesn't need to replay the conversation — they can read the ledger.

Analytics closes the feedback loop. The funnel tracks from impressions to Razorpay-paid orders. Anomaly detection flags spikes. The AI daily brief synthesizes everything. And the recommendations feed right back into the Operator.

Everything is documented. The README has Track 01 compliance, architecture, and a full postmortem. The Docs folder has deep dives on payments, the operator's 25 tools, the protocol context, and the failure matrix. 507 tests. Zero type errors. The repo is the submission — judges, dig in.

MediaOS doesn't just generate marketing. It closes the loop between acquisition and payment. The merchant is transactable — by humans and by AI buyers. Built on Razorpay. Thank you.

---

## Judge click-path (standalone, zero setup)

If the judge wants to explore without watching the video:

1. Open https://mediaos-kappa.vercel.app — Command Center
2. Open https://mediaos-kappa.vercel.app/lp/aarogya-fit — pay with test card `4111 1111 1111 1111`
3. Open https://mediaos-kappa.vercel.app/api/commerce/catalog — machine-readable catalog
4. Click **Operator** → "What can you do right now?" → see all 25 tools
5. Ask "Launch an AarogyaFit campaign for fitness-conscious 22-35 year olds"
6. Ask "Show the growth scorecard" → audience CPA comparison
7. Ask "Reallocate budget from audience C to B" → mandate + audit
8. Ask "Show the audit trail" → every money action with reasons
9. Test failure: on `/lp/aarogya-fit`, use UPI `failure@razorpay` → stop-rule
10. Navigate: Research → Campaigns → Creatives → Landing Pages → Analytics
11. GitHub: https://github.com/Adit-Jain-srm/Razorpay-AI-Builder — read README + Docs/
