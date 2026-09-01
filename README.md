# MediaOS - The AI Media Buyer

> One tool. Full funnel. Research-powered.

[Live Demo](https://mediaos-kappa.vercel.app) | [Video Walkthrough](#how-to-use-the-demo)

## What does this tool do?

MediaOS is an AI media buyer you can hire in a browser tab. Its Operator agent plans, executes, monitors, and improves paid-media campaigns end to end. You give it a goal ("launch ads for a crypto newsletter targeting near-retirees"), and it researches the audience with live web data, synthesizes personas from real pain points, generates platform-specific ad creatives with AI visuals, deploys a landing page you can open on your phone, and watches performance metrics for anomalies.

The core differentiator is the **Audience Research Intelligence Engine**: six real-data providers (competitor ads, search intent, Reddit/community, news, social listening, web intelligence) aggregated through Bright Data the way OpenBB aggregates financial data. Every downstream artifact (copy, images, landing pages, recommendations) is grounded in cited, real-world audience intelligence. This is live and clickable, not a prototype.

## Why did you build THIS one?

Every team already has creative tools and dashboards. Nobody has an automated system that actually does the audience research, the highest-leverage, least-automated step in media buying. The brief said "do the research." I built the agent that does it.

Most AI marketing tools bolt a chatbot onto existing workflows. MediaOS inverts that: the research engine is the foundation, the agent is the primary surface, and the traditional screens (campaigns, creatives, analytics) are secondary control surfaces you drop into when you want manual control. The compounding insight is that research makes everything else better. A persona built from real Reddit pain points produces stronger hooks than one guessed from demographics. And the agent turns a pile of disconnected tools into a teammate that remembers context across steps.

## What would you build next?

**Closed-loop learning.** Live ad-platform APIs (Google, Meta, TikTok) feeding real performance data back into the research engine so the system learns which audience angles convert, not just which ones exist.

**Real-time competitive monitoring.** Alerts when a competitor launches new creatives or pauses campaigns, feeding fresh intel into the Operator's planning loop.

**MCP server.** Expose MediaOS as a tool server so existing AI stacks can call the Operator, its research engine, and creative generation programmatically.

**CRM/LTV correlation.** Link downstream revenue to upstream research angles to prove which audience insights drive lifetime value, not just clicks.

Every new data provider makes the entire platform smarter. That is the OpenBB compounding effect applied to paid media.

---

## How to use the demo

1. Open [mediaos.vercel.app](https://mediaos-kappa.vercel.app)
2. The **Command Center** shows a live campaign ("Retirement Income Weekly") with real analytics, creatives, and a deployed landing page.
3. Open the **Operator** and ask: *"Find a fresh angle for near-retirees worried about inflation and build me 3 Meta ads."*
4. Watch the agent plan, research (Bright Data), synthesize a persona, and generate hook-analyzed ad variants with real AI visuals.
5. Ask *"Build a landing page for the strongest angle"* - it deploys a real `/lp/...` page you can open on your phone.
6. Open **Performance Intelligence** - the AI daily brief flags anomalies and recommends actions.

---

## Architecture

MediaOS is agent-native: the Operator is the primary surface, with a plan-execute-observe runtime that calls 17 typed, Zod-validated tools spanning every module. The research engine follows an OpenBB-inspired TET (Transform-Extract-Transform) provider abstraction with 6 providers running in parallel over Bright Data (SERP API, Web Unlocker, Scraping Browser). AI generation uses Azure AI Foundry (gpt-5.3-chat for reasoning/copy, MAI-Image-2.5 for visuals) through the Vercel AI SDK. Persistence is Supabase (Postgres with RLS, Auth, Storage). See [Docs/architecture.md](Docs/architecture.md) for the full system diagram and data-flow.

## Tech Stack

- **Framework:** Next.js 16, React 19.2, TypeScript strict
- **Styling:** Tailwind CSS v4, shadcn (Base UI), Geist/Geist Mono
- **AI:** Azure AI Foundry (gpt-5.3-chat + MAI-Image-2.5), Vercel AI SDK v7
- **Research data:** Bright Data (SERP API, Web Unlocker, Scraping Browser via puppeteer-core)
- **Database:** Supabase (Postgres + RLS + Auth + Storage)
- **State:** Zustand, TanStack Query
- **Charts:** Recharts
- **Testing:** Vitest (418 unit/integration tests), Playwright (e2e)
- **Quality:** ESLint, Conventional Commits, strict TSConfig
- **Deploy:** Vercel (Edge + Node runtimes)

## Running locally

```bash
git clone https://github.com/Adit-Jain-srm/MediaOS.git
cd MediaOS
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

## License

MIT
