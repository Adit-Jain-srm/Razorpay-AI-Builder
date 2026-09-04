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

---

## Video script (screen-by-screen)

Screen recording + voiceover. Speak naturally, not fast. ~7 minutes.

---

### 1 — Open on the product (0:00-0:25)

**Screen:** `mediaos-kappa.vercel.app` — Command Center already loaded.

**Say:**
"Okay so this is MediaOS. I built this for Track 01. The idea is pretty simple — a small Indian merchant, say someone selling a fitness program, they don't have a marketing team. They don't have an agentic checkout. And with UAP, ACP, AP2 happening right now, they need a way to make their products buyable by AI agents too, not just humans.

So I built an agent that does the whole thing — research to Razorpay payment. Let me walk you through it."

---

### 2 — Command Center walkthrough (0:25-1:00)

**Screen:** Still on `/`. Mouse over each section as you talk.

**Say:**
"This is the Command Center. Up here is the Morning Brief — it runs anomaly detection on campaign metrics overnight, z-score based, and gives you the top three things to act on. Scale this, pause that, reallocate here.

These are the live stats — impressions, clicks, conversions, spend. And down here is the active campaign card with quick links into every module. Research, Creatives, Landing Pages, Analytics — all one click.

But the real surface is the Operator. Let me show you that first."

---

### 3 — Operator: what can it do? (1:00-1:40)

**Screen:** Click into `/operator`. Type the prompt.

**Prompt:** "What can you do right now, and what is coming soon?"

**Say:**
"So this is the Operator — the main agent. Let me ask it what it can do."

*(Wait for response to render)*

"So there's 25 tools here, across seven categories. Research, campaigns, creatives, landing pages, analytics, payments, commerce. Each one is Zod-validated — the model can't hallucinate parameters, they get rejected. And every tool is wrapped in a fail-safe boundary, so if something throws, the agent recovers instead of crashing.

This isn't a chatbot wrapper. It runs a plan-execute-observe loop — it makes a plan, calls tools, reads the results, and adapts. Let me show you the full golden path."

---

### 4 — Operator golden path (1:40-2:40)

**Screen:** Still in `/operator`. Type the prompt.

**Prompt:** "Launch an AarogyaFit campaign targeting fitness-conscious 22-35 year olds in India. Research the audience, create Meta creatives, build and deploy a landing page with Razorpay checkout."

**Say:**
"One prompt. Watch what happens."

*(Let tools stream — narrate as they fire)*

"It's researching the audience first — six Bright Data providers running in parallel. Search intent, Reddit, competitor ads, news... okay, now it's creating the campaign from that research. INR budget. Sales objective. Now creatives — these are Meta ad variants, each one gets a hook classification and a score.

Now it's building the landing page... deploying it... and setting up the Razorpay checkout session. There's the payment link."

**Fallback:** If Azure is slow or offline, say: "The agent needs Azure to run live, so let me show you the seeded version that's already deployed." Navigate to `/lp/aarogya-fit`.

---

### 5 — Quick tour: Research, Campaigns, Creatives + Image Gen (2:40-3:30)

**Screen:** Click through `/research` → `/campaigns` → `/creatives`. On creatives, click "Generate Image" on one variant.

**Say:**
"Let me quickly show you the modules the agent just used.

Research — here are the personas it synthesized. Real pain points in the audience's own words. Competitor ad angles. Everything is cited with source URLs — the engine runs six Bright Data providers in parallel through an OpenBB-inspired TET abstraction. It doesn't hallucinate research.

Campaigns — here's the hub. Brief, value props, audience personas, platform recommendations, budget split. All in INR. The schema is Zod-validated end to end — same validation the Operator uses.

Creatives — platform-ready ad variants for Meta, Google, TikTok. Each one is classified by psychological hook — fear, curiosity, FOMO, social proof, urgency, exclusivity — and scored 0 to 100. If one scores low, regenerate it.

And watch this — I can generate ad visuals right here. This hits Azure AI Foundry's MAI-Image-2.5 model."

*(Click "Generate Image" on a creative variant. Wait for the image to appear.)*

"That's a production-ready ad image generated from the creative's headline. The whole stack is Next.js 16, React 19, TypeScript strict, Vercel AI SDK v7 for the agent loop, Azure AI Foundry for chat and image generation, Supabase for persistence with RLS, and Razorpay test-mode for payments."

---

### 6 — Landing pages and the editor (3:30-4:00)

**Screen:** Navigate to `/landing-pages`. Click into a page.

**Say:**
"Landing pages. Three seeded pages — AarogyaFit with Razorpay Checkout, and two retirement income A/B variants splitting traffic 50/50.

The editor has 14 section types. Five templates — squeeze, long-form sales, quiz funnel, advertorial, listicle. Every generated page gets a checkout section by default — SKU and price resolved from the catalog at render time, not hardcoded. The whole renderer is server-rendered React 19 with CSS variable theming."

---

### 7 — Live payment (4:00-4:40)

**Screen:** Open `/lp/aarogya-fit` (the deployed page).

**Say:**
"Okay, here's the actual page a buyer sees. Hero, features, social proof... and here's the checkout section.

Notice the order summary — product name, price, Pay button, and trust signals. The price is resolved server-side from the product catalog. The client never sends an amount — server-priced SKUs, integer paise only, never floats.

Let me pay."

*(Click Pay. Razorpay modal opens. Enter test card.)*

"Test card, any expiry, any CVV..."

*(Payment completes. Redirected to thanks page.)*

"And here's the receipt. Product, order ID, Razorpay order ID, payment ID, amount, status — Captured. This is pulled from the server-side order store — dual-indexed by our UUID and Razorpay's order ID for O(1) lookup. There's even a receipt email simulation. Real payment loop, not a mock."

---

### 8 — Failure and the stop-rule (4:40-5:10)

**Screen:** Go back to `/lp/aarogya-fit`. Click Pay again.

**Say:**
"Now let me show you what happens when payment fails. I'll use the Razorpay test UPI — `failure@razorpay`."

*(Enter failure@razorpay or select Failure in mock bank. Payment fails. Redirected to failed page.)*

"So look at this. It doesn't just say 'try again.' There's a stop-rule — 'This order will not be retried. The policy engine prevents automatic retries after a failed payment.' And this card — every money action is auditable, this failure has been logged.

If you want to buy again, it's a new order with a new mandate. The failed one stays failed. That's one failure handled gracefully."

---

### 9 — The catalog API (5:10-5:30)

**Screen:** Open `mediaos-kappa.vercel.app/api/commerce/catalog` in a new tab.

**Say:**
"This is the other side of Track 01 — making the merchant transactable by AI buyers.

ACP-inspired product catalog. Three products, prices in integer paise, availability, upsell and cross-sell graphs, and checkout endpoints. An AI agent can hit this JSON feed, discover products, check eligibility, and create a checkout session through the REST API. The merchant is sellable to both humans and machines."

---

### 10 — Growth scorecard and budget reallocation (5:30-6:00)

**Screen:** Back to `/operator`.

**Prompt 1:** "Show the growth scorecard"
**Prompt 2:** "Shift 15% budget from audience C to B — C has 2x higher CPA"

**Say:**
"Okay so the agent doesn't just launch — it optimizes.

Growth scorecard — CTR, CVR, CPA, GMV per audience. B is clearly the winner here, lowest CPA. C is burning budget.

So I'll tell it to reallocate."

*(Type the reallocation prompt)*

"It checks policy — is the currency INR? Is the reason long enough? Does it need a mandate? All pass. Budget shifted. Audit event written. The LLM proposed it, but the deterministic policy engine decided. That's the split — AI does research and copy, policy does money."

---

### 11 — Audit trail (6:00-6:20)

**Screen:** Still in the Operator.

**Prompt:** "Show the full audit trail"

**Say:**
"And here's every money action that happened. Order created, payment captured, payment failed, budget reallocated, product added, mandate denied — each one with a timestamp, who did it, why, and whether it was allowed or not.

See this denied one? Reason was too short — policy rejected it. And here's the failed payment with the stop-rule. Fifteen action types total. The judge doesn't need to replay the chat — the ledger tells the whole story."

---

### 12 — Analytics (6:20-6:45)

**Screen:** Navigate to `/analytics` → click into the campaign.

**Say:**
"Last module — analytics. Portfolio overview up top. Click into the campaign and you get the full picture.

The funnel goes from impressions all the way down to Razorpay-paid orders. Platform breakdown, creative correlation — which ad is actually converting. Anomaly detection flags weird spikes. And the AI daily brief summarizes everything in one paragraph with a recommended next action. This feeds back into the Operator — it's a loop."

---

### 13 — Close on the repo (6:45-7:15)

**Screen:** Open `github.com/Adit-Jain-srm/Razorpay-AI-Builder`. Scroll the README.

**Say:**
"Everything is in the repo. Track 01 compliance table right here — explainable, bounded, gated, audit, failure, all checked.

For judges who want to dig deeper — Docs/payments.md covers the full Razorpay integration, policy engine, and HMAC. Docs/operator-tools.md has the 25-tool catalog. The buildathon folder has the track bar decoded, the protocol context, the failure matrix. And the full 'what broke' postmortem is here in the README — seven incidents, all with root cause and fix.

507 tests. Zero type errors. 14 section types. 15 audit actions. 25 agent tools. 3 products in the catalog. Dual HMAC. Integer paise everywhere.

MediaOS closes the gap between acquisition and payment. The merchant is transactable. Built on Razorpay. Thanks for watching."

---

## Pure script (voiceover only)

Read this while recording. No stage directions.

---

Okay so this is MediaOS. I built this for Track 01. The idea is pretty simple — a small Indian merchant, say someone selling a fitness program, they don't have a marketing team. They don't have an agentic checkout. And with UAP, ACP, AP2 happening right now, they need a way to make their products buyable by AI agents too, not just humans. So I built an agent that does the whole thing — research to Razorpay payment. Let me walk you through it.

This is the Command Center. Up here is the Morning Brief — it runs anomaly detection on campaign metrics overnight, z-score based, and gives you the top three things to act on. Scale this, pause that, reallocate here. These are the live stats — impressions, clicks, conversions, spend. And down here is the active campaign card with quick links into every module. But the real surface is the Operator. Let me show you that first.

So this is the Operator — the main agent. Let me ask it what it can do.

So there's 25 tools here, across seven categories. Research, campaigns, creatives, landing pages, analytics, payments, commerce. Each one is Zod-validated — the model can't hallucinate parameters, they get rejected. And every tool is wrapped in a fail-safe boundary, so if something throws, the agent recovers instead of crashing. This isn't a chatbot wrapper. It runs a plan-execute-observe loop — it makes a plan, calls tools, reads the results, and adapts. Let me show you the full golden path.

One prompt. Watch what happens.

It's researching the audience first — six Bright Data providers running in parallel. Search intent, Reddit, competitor ads, news... okay, now it's creating the campaign from that research. INR budget. Sales objective. Now creatives — these are Meta ad variants, each one gets a hook classification and a score. Now it's building the landing page... deploying it... and setting up the Razorpay checkout session. There's the payment link.

Let me quickly show you the modules the agent just used. Research — here are the personas it synthesized. Real pain points in the audience's own words. Competitor ad angles. Everything is cited with source URLs — the engine runs six Bright Data providers in parallel through an OpenBB-inspired TET abstraction. It doesn't hallucinate research. Campaigns — the hub. Brief, value props, audience personas, platform recommendations, budget split. All in INR. The schema is Zod-validated end to end. Creatives — platform-ready ad variants for Meta, Google, TikTok. Each one classified by psychological hook and scored 0 to 100. If one scores low, regenerate it. And I can generate ad visuals right here — this hits Azure AI Foundry's MAI-Image-2.5 model. The whole stack is Next.js 16, React 19, TypeScript strict, Vercel AI SDK v7 for the agent loop, Azure AI Foundry for chat and image generation, Supabase for persistence with RLS, and Razorpay test-mode for payments.

Landing pages. Three seeded pages — AarogyaFit with Razorpay Checkout, and two retirement income A/B variants splitting traffic 50/50. The editor has 14 section types. Five templates. Every generated page gets a checkout section by default — SKU and price resolved from the catalog at render time, not hardcoded. The whole renderer is server-rendered React 19 with CSS variable theming.

Okay, here's the actual page a buyer sees. Hero, features, social proof... and here's the checkout section. Notice the order summary — product name, price, Pay button, trust signals. The price is resolved server-side. The client never sends an amount — server-priced SKUs, integer paise only, never floats. Let me pay.

Test card, any expiry, any CVV...

And here's the receipt. Product, order ID, Razorpay order ID, payment ID, amount, status — Captured. Pulled from the server-side order store — dual-indexed by our UUID and Razorpay's order ID for O(1) lookup. Receipt email simulation. Real payment loop, not a mock.

Now let me show you what happens when payment fails. I'll use the test UPI — failure@razorpay.

So look at this. It doesn't just say "try again." There's a stop-rule — this order will not be retried. The policy engine prevents automatic retries after a failed payment. And this card — every money action is auditable, this failure has been logged. If you want to buy again, it's a new order with a new mandate. The failed one stays failed. That's one failure handled gracefully.

ACP-inspired product catalog. Three products, prices in integer paise, availability, upsell and cross-sell graphs, checkout endpoints. An AI agent can hit this JSON feed, discover products, and create a checkout session through the REST API. The merchant is sellable to both humans and machines.

The agent doesn't just launch — it optimizes. Growth scorecard — CTR, CVR, CPA, GMV per audience. B is the winner, lowest CPA. C is burning budget. So I'll tell it to reallocate. It checks policy — is the currency INR? Reason long enough? Mandate required? All pass. Budget shifted. Audit event written. The LLM proposed it, but the deterministic policy engine decided. AI does research and copy. Policy does money.

And here's every money action that happened. Order created, payment captured, payment failed, budget reallocated, product added, mandate denied — each one with timestamp, actor, reason, outcome. See this denied one? Reason was too short — policy rejected it. Fifteen action types. The judge doesn't need to replay the chat — the ledger tells the story.

Last module — analytics. The funnel goes from impressions to Razorpay-paid orders. Platform breakdown, creative correlation. Anomaly detection flags spikes. The AI daily brief summarizes everything with a recommended next action. It feeds back into the Operator — the whole thing is a loop.

Everything is in the repo. Track 01 compliance table, architecture diagram, full documentation. For judges who want to dig deeper — payments.md covers Razorpay and HMAC, operator-tools.md has the 25-tool catalog, the buildathon folder has the track bar decoded and the protocol context. The full "what broke" postmortem is in the README — seven incidents with root cause and fix. 507 tests. Zero type errors. MediaOS closes the gap between acquisition and payment. The merchant is transactable. Built on Razorpay. Thanks for watching.

---

## Judge click-path (standalone, zero setup)

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
11. GitHub: https://github.com/Adit-Jain-srm/Razorpay-AI-Builder — README + Docs/
