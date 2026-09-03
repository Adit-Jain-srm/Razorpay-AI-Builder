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
Target length: ~7 minutes. Every feature gets screen time.

---

### Beat 1 — HOOK (0:00-0:30)

**Screen:** Browser tab open to `mediaos-kappa.vercel.app`. Cursor hovers over the Command Center.

**Say:**
"Small Indian merchants have no media team, no agentic checkout, and no way to make their products sellable to AI buyers. Meanwhile, 2026 is the year of the protocol race — NPCI is building the Unified Agent Protocol for UPI, OpenAI and Stripe launched the Agentic Commerce Protocol, Google has AP2, Coinbase has x402. Merchants need a tool to participate. I built one. This is MediaOS — an autonomous AI growth agent that closes the loop from audience research to Razorpay rupee, with a policy engine and audit trail on every money action."

**Track 01 bar:** Problem taste (Indian merchant + agentic commerce).

---

### Beat 2 — SOLUTION + ARCHITECTURE (0:30-0:50)

**Screen:** Show the Mermaid architecture diagram from `README.md` (screenshotted or scrolled to in the repo). Highlight: Operator (25 tools) → Policy Engine → Razorpay Test Mode → Audit Trail.

**Say:**
"MediaOS is a Next.js 16 app with 25 typed agent tools, a deterministic policy engine that gates every money action, Razorpay test-mode Standard Checkout, dual HMAC verification, and an append-only audit trail. The AI proposes. The policy decides. The audit proves it. Let me show you everything."

**Track 01 bar:** Build quality (typed, tested, documented).

---

### Beat 3 — COMMAND CENTER (0:50-1:30)

**Screen:** `mediaos-kappa.vercel.app/` — the Command Center.

**Walk through:**
1. Point to the **Morning Brief** card — "This is the AI-generated morning brief. It detects anomalies in campaign performance using z-score analysis and surfaces the top 3 recommended actions — scale, pause, refresh, reallocate."
2. Point to the **StatsGrid** — "Impressions, clicks, conversions, spend — animated counters, all from the seeded campaign data."
3. Point to the **Quick Actions** — "Two primary actions: Open the Operator, or Run Audience Research. These are the two entry points."
4. Point to the **Campaign Card** — "The active campaign card links to Research, Creatives, Landing Pages, and Analytics. Every module is one click away."

**Say:**
"The Command Center is the merchant's cockpit. Morning Brief tells you what happened overnight. Stats show the pulse. Quick actions get you into the agent or the research engine."

**Track 01 bar:** Build quality (polished UI, real metrics).

---

### Beat 4 — RESEARCH ENGINE (1:30-2:00)

**Screen:** Click "Run audience research" → navigate to `/research`. Click into the seeded research project.

**Walk through:**
1. Show the **Research Workspace** — personas cards, pain points with real quotes, competitor ad angles, source citations.
2. Point to the **6 Bright Data providers** — "Search intent, community discussions, competitor ads, news, social signals, web intelligence — all aggregated and synthesized."
3. Point to the **Source citations** — "Every claim is cited. The agent doesn't hallucinate research — it aggregates from live web data."

**Say:**
"The research engine is the moat. Six Bright Data providers run in parallel, and the output is synthesized into cited personas, ranked pain points in the audience's own words, competitor ad angles, and opportunities. This grounds everything downstream — the campaign brief, the creatives, the landing page copy."

**Track 01 bar:** AI judgment (research is AI; policy is deterministic).

---

### Beat 5 — CAMPAIGNS + CREATIVES (2:00-2:30)

**Screen:** Navigate to `/campaigns` → click the demo campaign → show the Campaign Hub. Then navigate to `/creatives`.

**Walk through:**
1. **Campaign Hub** — "The brief: objective, value props, audience personas, selected platforms, budget split. INR currency, sales objective."
2. **Creative Studio** — "Platform-specific ad variants — Meta, Google, TikTok. Each one is scored 0-100 for direct-response quality: clarity, specificity, CTA strength, hook strength."
3. Point to **hook classification** — "Every creative is classified by psychological hook — fear, curiosity, FOMO, social proof, urgency, exclusivity."
4. Point to **regenerate** — "If a creative scores below threshold, regenerate it in one click."

**Say:**
"Campaigns are the hub linking research to execution. The creative studio generates platform-ready ad variants, each hook-classified and scored. Low scorers get regenerated. The agent can do all of this autonomously through the Operator."

**Track 01 bar:** Build quality (real creative engine, not mockups).

---

### Beat 6 — LANDING PAGES + EDITOR (2:30-3:15)

**Screen:** Navigate to `/landing-pages` → show the landing manager with seeded pages. Click into one to show the editor.

**Walk through:**
1. **Landing Manager** — "Three seeded pages: AarogyaFit with Razorpay Checkout, and two retirement income A/B variants. Create new pages from 5 templates: squeeze, long-form sales, quiz funnel, advertorial, listicle."
2. **Editor** — "Live preview of 14 section types: hero, rich text, features, social proof, testimonials, listicle, FAQ, countdown timer, quiz funnel, lead form, exit intent popup, CTA, checkout, and compliance disclosures."
3. **A/B testing** — "Pages can be grouped into experiments with weighted traffic splits. The seeded retirement campaign has A/B variants: 'no-upsell trust' vs 'inflation fear.'"
4. **Checkout section** — "Every generated page now includes a Razorpay Checkout section by default. SKU and price are resolved from the product catalog, not hardcoded."

**Say:**
"The landing page engine generates conversion-structured pages with 14 section types, A/B testing, and Razorpay Checkout baked in. This is what the buyer actually sees and pays on."

**Track 01 bar:** Build quality (14 section types, A/B, checkout integration).

---

### Beat 7 — OPERATOR GOLDEN PATH (3:15-4:00)

**Screen:** Navigate to `/operator`. Type the prompt.

**Prompt to type:**
"Launch an AarogyaFit campaign targeting fitness-conscious 22-35 year olds in India. Research the audience, create Meta creatives, build and deploy a landing page with Razorpay checkout."

**Walk through:**
1. The agent creates a **plan** — visible in the chat.
2. Watch it call tools in sequence: `research_audience` → `create_campaign` → `generate_creatives` → `build_landing_page` → `deploy_landing_page` → `create_checkout_session`.
3. Each tool call streams live — show the **artifacts** appearing (research report, campaign, creative set, landing page card, checkout session).
4. The agent returns a **checkout URL** — "The buyer can pay at /lp/... using Razorpay test-mode."

**Say:**
"This is the Operator — 25 tools, plan-execute-observe loop, streaming. One prompt and it researches, strategizes, creates, deploys, and sets up payment. The golden path runs end to end."

**Fallback:** If Azure is slow, navigate directly to `/lp/aarogya-fit` and say "I'll show the seeded AarogyaFit page that the Operator generated earlier."

**Track 01 bar:** All (the golden path demonstrates every bar item).

---

### Beat 8 — LIVE PAYMENT (4:00-4:30)

**Screen:** Open the deployed landing page (from the Operator result, or `/lp/aarogya-fit`).

**Walk through:**
1. Scroll the page — "Hero, features, social proof, testimonials, FAQ — all generated from the research."
2. Scroll to the **checkout section** — "Order summary: product name, price ₹1,499, Pay button, trust signals — Lock icon, Razorpay Test Mode badge."
3. Click **Pay** — Razorpay modal opens with prefilled test data.
4. Enter test card `4111 1111 1111 1111`, any expiry, any CVV.
5. Complete payment → redirected to `/lp/.../thanks`.
6. Show the **thanks page** — "Server-side order receipt: product, order ID, Razorpay order ID, payment ID, amount, status Captured, timestamp. Plus a simulated receipt email notification."

**Say:**
"Real Razorpay Standard Checkout on a real deployed page. Server-priced — the client never sets the amount. HMAC-verified. And the thanks page pulls the order from the server store, not just query params."

**Track 01 bar:** Bounded + gated (server-priced, policy-checked).

---

### Beat 9 — FAILURE DEMO (4:30-5:00)

**Screen:** Go back to the landing page. Click Pay again.

**Walk through:**
1. In the Razorpay modal, use UPI ID `failure@razorpay` (or pick "Failure" in the mock bank).
2. Payment fails → redirected to `/lp/.../failed`.
3. Show the **failed page** — "Stop-rule message: 'This order will not be retried. The policy engine prevents automatic retries after a failed payment.' Plus 'Every money action is auditable — this failure has been logged.'"
4. Point to the **Track 01 compliance card** with ShieldWarning icon.

**Say:**
"This is the Track 01 bar in action. Payment failed — and the system doesn't just say 'try again.' It enforces a stop-rule: the failed order is logged, and the policy engine will not retry it. A new checkout creates a new order with a fresh mandate. This is graceful failure handling."

**Track 01 bar:** Failure handled gracefully (the headline bar item).

---

### Beat 10 — CATALOG API + AGENTIC COMMERCE (5:00-5:30)

**Screen:** Open `mediaos-kappa.vercel.app/api/commerce/catalog` in a browser tab.

**Walk through:**
1. Show the **JSON response** — "ACP-inspired catalog feed. Three products, all INR, with `is_eligible_checkout: true`, upsell and cross-sell graphs, and checkout endpoints."
2. Point to `create_order` and `create_session` endpoints — "An AI buyer can discover these products, check eligibility, and create a checkout session programmatically."
3. Mention `llms.txt` — "There's an `llms.txt` pointing AI agents at the catalog and the checkout contract."

**Say:**
"This isn't just a human checkout. The catalog is machine-readable — inspired by OpenAI's Agentic Commerce Protocol. Products, prices in paise, availability, upsell graph, and checkout endpoints. An AI buyer can transact with this merchant end to end. That's the second Track 01 clause: making the merchant transactable by AI buyers."

**Track 01 bar:** Agent-readable catalog (Track 01 example direction).

---

### Beat 11 — GROWTH SCORECARD + BUDGET REALLOCATION (5:30-6:00)

**Screen:** Back to `/operator`. Type the prompts.

**Prompt 1:** "Show the growth scorecard"
**Prompt 2:** "Shift 15% budget from audience C to B — C has 2x higher CPA"

**Walk through:**
1. **Growth scorecard** — "Per-audience metrics: CTR, CVR, CPA in paise, Razorpay GMV, orders, spend. Audience B is the winner — lowest CPA, highest GMV."
2. **Reallocation** — "The agent proposes shifting budget from C to B. The policy engine checks: currency INR, reason length 24+ chars, mandate required. It's allowed — audit event written."
3. Point to the **mandate** — "AP2-style: action, amount, max, reason, evidence, decidedBy: policy."

**Say:**
"The Operator doesn't just launch campaigns — it optimizes them. The growth scorecard shows which audience is working. Budget reallocation is policy-gated: the LLM proposes, but the deterministic engine decides. Every reallocation writes a mandate and an audit event."

**Track 01 bar:** Explainable + bounded + gated (reason, mandate, policy).

---

### Beat 12 — AUDIT TRAIL (6:00-6:30)

**Screen:** Still in the Operator.

**Prompt:** "Show the full audit trail for this campaign"

**Walk through:**
1. Show the **audit timeline** — "Every money action: order_created, payment_captured, payment_failed, budget_reallocated, product_added, mandate_denied — all with timestamp, actor, reason, and outcome."
2. Point to a **denied mandate** — "This one was denied because the reason was too short. The policy engine rejected it."
3. Point to **payment_failed** — "The stop-rule is right here — 'this order will not be retried.'"

**Say:**
"This is the audit trail the Track 01 bar asks for. Every money action is logged with who did it, why, and what happened. Allowed or denied. Captured or failed. The judge doesn't need to replay the chat — they can read the ledger."

**Track 01 bar:** Audit trail shown (the explicit bar item).

---

### Beat 13 — ANALYTICS DEEP DIVE (6:30-7:00)

**Screen:** Navigate to `/analytics` → click into the campaign.

**Walk through:**
1. **Portfolio overview** — total spend, conversions, ROAS across all campaigns.
2. **Campaign analytics** — funnel (Impressions → Clicks → LP Views → Checkout Started → Paid), platform breakdown, creative correlation.
3. **Anomaly detection** — "Z-score anomaly detection flagged a CPA spike on Meta last Tuesday."
4. **Recommendations** — "Scale the top Google RSA. Pause the fatigued TikTok hook. Reallocate to the best-ROAS platform."
5. **AI daily brief** — "Natural-language summary: headline result, trend, standout platform, anomaly, recommended action."

**Say:**
"Analytics closes the feedback loop. The extended funnel now tracks from impressions through to Razorpay-paid orders. Anomaly detection runs z-score analysis. The AI daily brief synthesizes everything into one paragraph. And the recommendations feed back into the Operator — scale, pause, refresh, reallocate."

**Track 01 bar:** Build quality (real analytics, not mockups).

---

### Beat 14 — WHAT BROKE + CLOSE (7:00-7:30)

**Screen:** Show the GitHub repo README briefly, then back to the Command Center.

**Say:**
"What broke. Three things worth mentioning. First — the Razorpay Checkout modal showed 'payment could not be completed' because the handler was async. Razorpay closes the modal before async resolves. Fix: sync handler, fire-and-forget verify, webhook is the source of truth.

Second — the seeded AarogyaFit page returned 404 on production. Supabase was configured but had no row. The in-memory seeded store wasn't consulted. Fix: fallthrough to seeded store.

Third — serverless statelessness. Product added on instance A, checkout on instance B. Fix: auto-create on the fly with the product details the client already has.

507 tests. 25 tools. 15 audit action types. 14 landing page section types. 3 products. Dual HMAC. Policy engine. Stop-rules. And every money action is explainable, bounded, gated, and audited.

MediaOS doesn't just generate marketing. It closes the loop between acquisition and payment. The merchant is transactable — by humans and by AI buyers. Built on Razorpay."

**Track 01 bar:** Failure recovery (honest postmortem).

---

## Judge click-path (standalone, zero setup)

If the judge wants to explore without watching the video:

1. Open https://mediaos-kappa.vercel.app — Command Center
2. Open https://mediaos-kappa.vercel.app/lp/aarogya-fit — pay with test card `4111 1111 1111 1111`
3. Open https://mediaos-kappa.vercel.app/api/commerce/catalog — machine-readable catalog
4. Click **Operator** → "Launch an AarogyaFit campaign for fitness-conscious 22-35 year olds"
5. Ask "Show the growth scorecard" → audience CPA comparison
6. Ask "Reallocate budget from audience C to B" → mandate + audit
7. Ask "Show the audit trail" → every money action with reasons
8. Test failure: on `/lp/aarogya-fit`, use UPI `failure@razorpay` → stop-rule
9. Navigate: Research → Campaigns → Creatives → Landing Pages → Analytics
10. GitHub: https://github.com/Adit-Jain-srm/Razorpay-AI-Builder
