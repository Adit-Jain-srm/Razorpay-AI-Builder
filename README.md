# MediaOS — Autonomous Merchant Growth Agent

> Research buyers. Deploy campaigns. Collect ₹. Optimize with an audit trail.

[Live Demo](https://mediaos-kappa.vercel.app) | [Video Walkthrough](#how-to-use-the-demo) | [Razorpay AI Buildathon Track 01](https://razorpay.com/buildathon/)

## What does this tool do?

MediaOS is an autonomous AI growth agent for Indian merchants. Its Operator agent researches buyers with live web data, orchestrates a bounded ₹ campaign, generates platform-specific creatives and conversion-optimized landing pages with Razorpay test-mode Checkout, exposes an agent-readable product catalog, upsells within a signed mandate, and optimizes toward a measurable ₹ objective — with an append-only audit trail on every money action, including graceful handling of payment failures.

The core differentiator is the **Audience Research Intelligence Engine**: six real-data providers (competitor ads, search intent, Reddit/community, news, social listening, web intelligence) aggregated through Bright Data the way OpenBB aggregates financial data. Every downstream artifact (copy, images, landing pages, recommendations) is grounded in cited, real-world audience intelligence. This is live and clickable, not a prototype.

## Why did you build THIS one?

Every team already has creative tools and dashboards. Nobody has an automated system that actually does the audience research, the highest-leverage, least-automated step in media buying. The brief said "do the research." I built the agent that does it.

Most AI marketing tools bolt a chatbot onto existing workflows. MediaOS inverts that: the research engine is the foundation, the agent is the primary surface, and the traditional screens (campaigns, creatives, analytics) are secondary control surfaces you drop into when you want manual control. The compounding insight is that research makes everything else better. A persona built from real Reddit pain points produces stronger hooks than one guessed from demographics. And the agent turns a pile of disconnected tools into a teammate that remembers context across steps.

## What would you build next?

**Wave 7 (Track 01) has been built.** The Razorpay money loop, policy engine, audit trail, agent-readable catalog, checkout sessions, upsell graph, and executable budget reallocation are all shipped. What remains on the roadmap:

**Live ad-platform APIs.** Google, Meta, TikTok feeding real spend data back so CPA is not simulated.

**NPCI UAP integration.** When the Unified Agent Protocol spec is public, register MediaOS as a verified agent for UPI agentic payments.

**Full ACP certification.** Submit the product feed to OpenAI for Instant Checkout eligibility in ChatGPT.

---

## How to use the demo

1. Open [mediaos-kappa.vercel.app](https://mediaos-kappa.vercel.app)
2. The **Command Center** shows live campaigns with analytics, creatives, and deployed landing pages.
3. Open the **Operator** and ask: *"Launch an AarogyaFit campaign targeting fitness-conscious 22–35 year olds in India."*
4. Watch the agent plan, research (Bright Data), synthesize personas, create a campaign (INR budget), and generate hook-analyzed ad variants.
5. Ask *"Build a landing page with Razorpay checkout"* — it deploys a real `/lp/...` page with a Pay button.
6. On the deployed page, click **Pay now** — enter a test card (`4111 1111 1111 1111`) or UPI (`success@razorpay`).
7. Open **Performance Intelligence** — the AI daily brief flags anomalies and recommends budget reallocations.
8. Ask the Operator *"Show the audit trail"* — see every money action (order created, payment captured, budget reallocated) with timestamps and reasons.
9. Test failure: use UPI `failure@razorpay` — the audit shows the stop-rule: "do not retry this order."
10. Visit `/api/commerce/catalog` — the ACP-inspired product feed is agent-readable.

---

## Architecture

MediaOS is agent-native: the Operator is the primary surface, with a plan-execute-observe runtime that calls 22 typed, Zod-validated tools spanning research, campaigns, creatives, landing pages, analytics, payments, and commerce. The research engine follows an OpenBB-inspired TET (Transform-Extract-Transform) provider abstraction with 6 providers running in parallel over Bright Data (SERP API, Web Unlocker, Scraping Browser). Every money action is gated by a deterministic policy engine and logged to an append-only audit trail. AI generation uses Azure AI Foundry (gpt-5.3-chat for reasoning/copy, MAI-Image-2.5 for visuals) through the Vercel AI SDK. Payments use Razorpay Test Mode (Orders API + Standard Checkout + Webhooks). Persistence is Supabase (Postgres with RLS, Auth, Storage — 26 tables across 3 migrations). See [Docs/architecture.md](Docs/architecture.md) for the full system diagram and data-flow.

## Tech Stack

- **Framework:** Next.js 16, React 19.2, TypeScript strict
- **Styling:** Tailwind CSS v4, shadcn (Base UI), Geist/Geist Mono
- **AI:** Azure AI Foundry (gpt-5.3-chat + MAI-Image-2.5), Vercel AI SDK v7
- **Research data:** Bright Data (SERP API, Web Unlocker, Scraping Browser via puppeteer-core)
- **Payments:** Razorpay Test Mode (Orders API, Standard Checkout, Webhooks)
- **Database:** Supabase (Postgres + RLS + Auth + Storage) — 26 tables, 3 migrations
- **State:** Zustand, TanStack Query
- **Charts:** Recharts
- **Testing:** Vitest (499 unit/integration tests), Playwright (e2e)
- **Quality:** ESLint, Conventional Commits, strict TSConfig
- **Deploy:** Vercel (Edge + Node runtimes)

## Running locally

```bash
git clone https://github.com/Adit-Jain-srm/Razorpay-AI-Builder.git
cd Razorpay-AI-Builder
npm install
cp .env.example .env.local
# Fill in credentials (see .env.example for guidance)
npm run dev
```

The app boots without credentials in a degraded demo mode. To enable real AI and live research, fill in Supabase, Azure AI Foundry, and Bright Data keys. See [Docs/runbook.md](Docs/runbook.md) for full setup including Supabase migrations and environment details.

## Environment variables required for deployment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `AZURE_OPENAI_ENDPOINT` | Azure AI Foundry resource endpoint |
| `AZURE_OPENAI_API_KEY` | Azure AI Foundry API key |
| `AZURE_OPENAI_BASE_URL` | OpenAI-compatible v1 base URL |
| `AZURE_OPENAI_GPT4O_DEPLOYMENT` | Chat model deployment name |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Chat model (v1 alias) |
| `AZURE_OPENAI_IMAGE_DEPLOYMENT` | Image model deployment name |
| `AZURE_OPENAI_IMAGE_ENDPOINT` | MAI image generations endpoint |
| `AZURE_OPENAI_API_VERSION` | API version (`preview`) |
| `AZURE_AI_PROJECT_ENDPOINT` | Project endpoint for responses API |
| `BRIGHTDATA_API_TOKEN` | Bright Data API token |
| `BRIGHTDATA_WEB_UNLOCKER_ZONE` | Web Unlocker zone (default: `mcp_unlocker`) |
| `BRIGHTDATA_SERP_ZONE` | SERP zone (default: `serp_api1`) |
| `BRIGHTDATA_BROWSER_WS` | Scraping Browser WSS endpoint |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Test Mode key ID (`rzp_test_…`) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (server only) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret (server only, ≥32 chars) |

## License

MIT
