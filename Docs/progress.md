# MediaOS - Project Progress (single source of truth)

This is the durable tracker a fresh agent can resume from. Update it in the same change that alters
status. Cross-references: [architecture](./architecture.md), [ADRs](./adr/),
[research-engine](./research-engine.md), [api](./api.md), [runbook](./runbook.md),
[learnings](./learnings.md), [campaigns](./campaigns.md), [creative-studio](./creative-studio.md).

---

## Objective

Build **MediaOS** - an AI-native media buying platform whose primary surface is **the Operator**, an
autonomous agent that plans, executes, monitors, and improves marketing campaigns end to end. The
moat is the **Audience Research Intelligence Engine** (OpenBB-inspired, real data via Bright Data).
Goal: investor-demo quality, senior-level system design, win the It's Today Media build challenge.

---

## Current Status

**Wave 0 - Foundation: DONE, verified, committed.**

Delivered:
- Next.js 16 + React 19.2 + TS strict + Tailwind v4 + shadcn (base-nova / Base UI) scaffold.
- Supabase clients (browser/server/admin) + `src/proxy.ts` route protection.
- Full 19-table schema + RLS + storage buckets (`supabase/migrations/0001_init.sql`, `0002_storage.sql`).
- Shared contracts: typed errors, resilience (retry/timeout/circuit breaker), lazy env loader,
  Zod validators, Azure OpenAI client, research engine core (standard models, provider/TET, registry,
  orchestrator, Bright Data adapter, analyzer), agent tool registry + prompts, service stubs.
- Dashboard shell + auth pages + public `/lp/[slug]` route.
- **Test harness:** Vitest + Playwright wired; 35 passing unit tests across env, resilience,
  validators, and both registries; e2e golden-path seed.
- **Docs:** architecture, 4 ADRs, research-engine, api, runbook, learnings, this tracker.

Verification (foundation baseline): `npx tsc --noEmit`, `npm run lint`, `npm run build`,
`npm test` all green. Baseline committed - see `git log` for hashes.

**Wave 2 - Audience Research Intelligence Engine + Operator agent: DONE, verified, committed.**

Delivered (two parallel workers, integrated in a single pass):
- **Research Engine** (`src/lib/research/**`, `src/app/(dashboard)/research/**`,
  `src/components/research/**`, `src/app/api/research/run`): provider implementations (search-intent,
  news, reddit/community, social, competitor-ads, web-intel), analyzer, orchestrator, RLS-scoped
  persistence with a lossless report snapshot, and the full research workspace UI (personas, pain
  points, trends, competitor ads, sources/citations, comparison, export). Degrades through a **3-layer
  fallback** (live Bright Data -> enriched -> seeded fixtures) so it always renders with zero credentials.
- **Operator agent** (`src/lib/agent/**`, `src/app/(dashboard)/operator/**`,
  `src/app/api/operator/chat`, `src/components/agent/**`): plan/execute/observe runtime, streamed
  events, typed tool calls, fail-safe persistence, and the compact rail + full workspace chat UI. Runs
  in **demo-mode** with no Azure/Supabase credentials required.
- **Central typing fix:** `src/types/database.ts` Row shapes are now `type` aliases (not `interface`s)
  so `SupabaseClient<Database>` infers Row/Insert/Update; the per-module remap casts in `store.ts` and
  `persistence.ts` were removed (see [learnings](./learnings.md)).
- **Env consistency:** Bright Data zones (`BRIGHTDATA_WEB_UNLOCKER_ZONE`, `BRIGHTDATA_SERP_ZONE`) are
  now centralized in `src/lib/env.ts` + `.env.example` (optional, with defaults).

Verification (fresh run): `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npm test`
(**122 passing**, 16 files), and `npm run build` (success - the real integration gate that neither
worker had run). Committed as Conventional Commits and pushed to `origin/main`.

**Wave 3 - Campaigns + Creative Studio: DONE, verified, committed.**

Delivered (two parallel workers, integrated in a single pass):
- **Campaigns** (`src/lib/services/campaign.service.ts`, `src/lib/campaign/**`,
  `src/app/(dashboard)/campaigns/**`, `src/components/campaign/**`): RLS-scoped campaign CRUD, an AI
  **brief builder** (goal/audience/budget -> structured, editable brief with a deterministic fallback),
  **persona import** from saved research reports, a starting-point **template gallery**, a **budget
  allocator**, and **platform recommendations**, surfaced through the campaigns hub, detail, and
  new-campaign routes. See [campaigns](./campaigns.md).
- **Creative Studio** (`src/lib/services/creative.service.ts`, `src/lib/creative/**`,
  `src/app/(dashboard)/creatives/**`, `src/app/api/creative/**`, `src/components/creative/**`):
  platform-aware AI **copy + visual** generation with per-platform limit enforcement, psychological
  **hook analysis**, direct-response **variant scoring**, a research-derived **brand-voice** tone
  profile, and exportable creative bits. The generation route streams **NDJSON** on the Node runtime
  and degrades to seeded fixtures with zero credentials. See [creative-studio](./creative-studio.md).

Verification (fresh run): `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npm test`
(**237 passing**, 29 files), and `npm run build` (success - the real integration gate that neither
worker had run). **No build-only fixes were needed**: both workers' Server/Client boundaries were
already clean (client-safe barrel exports, server-only modules imported by explicit path, `runtime =
"nodejs"` on the streaming route). Committed as Conventional Commits and pushed to `origin/main`.

**Wave 4 - Landing Pages + Performance Intelligence (Analytics): DONE, verified, committed.**

Delivered (two parallel workers, integrated in a single pass):
- **Landing Pages** (`src/lib/landing/**`, `src/lib/services/landing.service.ts`,
  `src/components/landing-page/**`, `src/app/(dashboard)/landing-pages/**`, `src/app/lp/[slug]/page.tsx`,
  `src/app/api/leads/**`, `src/app/api/page-views/**`): an AI **landing-page generator** (sections,
  copy, theme) with a deterministic fallback, an in-app **editor/inspector + live preview**, slug
  management, A/B variants, and the **public `/lp/[slug]` route** that captures **leads** and
  **page-views** (UTM + cleaned referrer attribution) through anonymous-insert API routes scoped by the
  deployed-page RLS join. See [landing-pages](./landing-pages.md).
- **Performance Intelligence** (`src/lib/analytics/**`, `src/lib/seed/**`,
  `src/lib/services/analytics.service.ts`, `src/components/analytics/**`,
  `src/app/(dashboard)/analytics/**`): deterministic **90-day seeded metrics** (fatigue curves,
  seasonality, platform behaviors), **aggregation/math** utilities, **anomaly detection**, a
  **daily-brief** generator, and **recommendations**, surfaced through the analytics overview +
  per-campaign drill-down with funnel, time-series, platform-comparison, and creative-correlation
  charts and CSV export. See [analytics](./analytics.md).

Verification (fresh run): `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npm test`
(**337 passing**, 42 files), and `npm run build` (success - the real integration gate that neither
worker had run). **No build-only fixes were needed**: both workers' Server/Client boundaries were
already clean (client-safe barrels, server-only modules behind explicit paths, route handlers with
explicit runtime, `/lp/[slug]` dynamically server-rendered). Committed as Conventional Commits and
pushed to `origin/main`.

**All five product modules (Research, Campaigns, Creative Studio, Landing Pages, Performance
Intelligence) plus the Operator agent are now complete, verified, and committed.**

**Wave 5 - Operator tool-wiring + end-to-end orchestration (agent-tools + agent-integration): DONE, verified, committed.**

Delivered (`src/lib/agent/tools/**`, `src/components/agent/artifact-view.tsx`, `src/lib/agent/{prompts,plan,runtime}.ts`,
`src/app/api/operator/chat/route.ts`): **17 typed, Zod-validated module tools** wrapping every module
service (research `research_audience`/`get_personas`; campaign `create_campaign`/`recommend_platforms`/
`suggest_budget`/`list_campaigns`/`get_campaign`; creative `generate_creatives`/`score_creative`/
`regenerate_creative`; landing `build_landing_page`/`deploy_landing_page`; analytics
`get_performance_summary`/`detect_anomalies`/`get_recommendations`/`daily_brief`/`proactive_briefing`),
each **fail-safe** (`runToolSafely` → structured `{ ok:false }`, never throws) and registered idempotently
via `registerModuleTools()` (bootstrapped beside the built-ins in the route). The system prompt now teaches
the **golden path** (research → campaign → creatives → landing → analytics); the runtime step budget was
raised to 16 for the full chain; demo mode runs a scripted golden path that executes the real tools offline.
Rich per-type **artifact cards** were added to the client registry (personas, creative variants with hook
badges + scores, landing preview + live link, analytics summary/anomalies/recommendations, proactive
briefing). Proactive intelligence + improvement loop: `proactive_briefing` fuses brief + anomalies +
recommendations and emits one-tap next-actions that the runtime surfaces as suggestion chips
(`suggestionsFromArtifacts`); `regenerate_creative` repairs the weakest creative. See
[operator-tools](./operator-tools.md) + [ADR 0004](./adr/0004-agent-runtime.md).

Verification (fresh run, committer/integration gate): `npx tsc --noEmit` (0 errors), `npm run lint`
(0 errors), `npm test` (**376 passing**, 43 files - up from 337; +39 in `tools/module-tools.test.ts`),
and `npm run build` (**success** - the real integration gate that the capstone worker had not run).
**No build-only fixes were needed**: the server/client boundary was already clean - tool `execute`
bodies stay server-side (registered via `registerModuleTools()` in the route), domain output is mapped
to flat render-ready shapes in the PURE `tools/artifacts.ts`, and the client artifact registry
(`artifact-view.tsx`) renders the per-type cards. Committed as Conventional Commits and pushed to
`origin/main`.

**Wave 6 (part 1) - Azure AI Foundry client adaptation + LIVE validation: DONE, verified, committed, LIVE-VALIDATED.**

Flipped the platform from seeded fallbacks to **real AI**. `src/lib/ai/azure.ts` was rewired from
classic Azure OpenAI (`@ai-sdk/azure` deployment URLs + `api-key` header) to the **Foundry
OpenAI-compatible v1 surface**: chat now uses `@ai-sdk/openai`'s
`createOpenAI({ baseURL: AZURE_OPENAI_BASE_URL, apiKey })` with the **chat-completions** transport
(`provider.chat("gpt-5.3-chat")`) - the simplest path that keeps `streamText`/`generateText` +
tool-calling working - behind a `CHAT_TRANSPORT` constant that flips to the Responses API if ever
needed; image gen POSTs to the image endpoint with `Authorization: Bearer`, body
`{ prompt, model: "MAI-Image-2.5", n, size, output_format: "image/png" }`, parsing `data[0].b64_json`.
`src/lib/env.ts` gained the new optional keys (`AZURE_OPENAI_BASE_URL`, `AZURE_OPENAI_CHAT_DEPLOYMENT`,
`AZURE_OPENAI_IMAGE_ENDPOINT`, `AZURE_AI_PROJECT_ENDPOINT`, `preview` default) and `isAzureConfigured()`
now gates on key + (base URL or endpoint). **All exported client signatures are unchanged**, so no
consumer in `research`/`campaign`/`creative`/`landing`/`analytics`/`agent` needed edits.

**API path that worked:** chat = **chat-completions** (`provider.chat`), NOT the Responses API.
Two live corrections vs. the documented shape (the live API is authoritative): the image endpoint is
**`/mai/v1/images/generations`** (`/openai/v1/images/generations` validates input but **404s** on
generation), and `output_format` must be a **MIME type** (`image/png`), not bare `png`. Model quirk:
the AI SDK classifies `gpt-5.3-chat` as a **reasoning model** and drops `temperature` (warns, still
succeeds). See [learnings](./learnings.md) + [azure-models](./azure-models.md).

**Live validation (creds-gated `npm run smoke:azure`, NOT in CI):** chat `gpt-5.3-chat` returned
`"ok"` (~2.1s); image `MAI-Image-2.5` returned a valid base64 PNG (decoded + PNG-magic verified,
written to the git-ignored `scripts/.smoke-out.png`). The **committed test suite stays fully mocked +
offline** (`src/lib/ai/azure.test.ts`, `src/lib/env.test.ts`).

Verification (fresh run): `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npm test`
(**390 passing**, 44 files - up from 376; +14 across the new `ai/azure.test.ts` and `env.test.ts`
additions), `npm run build` (**success**). Dep added: `@ai-sdk/openai@4.0.2` (pairs exactly with
`ai@7.0.4`). Committed as Conventional Commits and pushed to `origin/main`. **Real AI is now active.**

**Wave 6 (part 2) - Bright Data live data + Scraping Browser: DONE, verified, committed, LIVE-VALIDATED.**

Flipped the research engine from fixtures to **real Bright Data live data**. No parser changes were
needed for the SERP/Unlocker path - a live round-trip proved `brightdata.ts` already matches the API.

**`brd_json` finding (live, authoritative):** on zone `serp_api1`, appending `brd_json=1` to a Google
search URL returns **parsed JSON** (`content-type: application/json`), top-level keys
`general, input, navigation, organic, top_ads, pagination, related`, with `organic[]` items shaped
`{ title, link, description, rank }` - exactly what `parseSerpJson` reads. The Web Unlocker
(`{ zone, url, format: "raw", data_format: "markdown" }`) returns clean markdown.

**Scraping Browser (new, `src/lib/research/scraping-browser.ts`):** a `withScrapingBrowser(fn)` helper
connects `puppeteer-core` to the **remote** `BRIGHTDATA_BROWSER_WS` (a pure WS client - no local
Chromium, so it runs on Vercel serverless / Node runtime), runs a navigation/extraction callback, and
**always disconnects** (bounded timeout + retry + leak-guarded `connect`). It returns `null` (never
throws) when the endpoint is unset or any step fails. `puppeteer-core` is **dynamically imported** so
it stays server-only and lazy (never in the client bundle; build confirms). The **competitor-ads**
provider now resolves Meta Ad Library cards through a graceful chain: **Scraping Browser -> Web
Unlocker markdown -> seeded ad-library fixture** (via the resilient client), and never throws to the
orchestrator. Exported provider/orchestrator signatures are unchanged.

**Live validation (creds-gated, NOT in CI):**
- `npm run smoke:brightdata` - SERP `"retirement income newsletter"` returned **9 organic results +
  8 related searches** (first: *Retirement Income Journal*); Unlocker markdown of `example.com`
  returned real markdown. Both HTTP 200.
- `npm run smoke:browser` - connected to the Scraping Browser over WSS (~1.5s), navigated
  `example.com`, page title `"Example Domain"`. Meta Ad Library navigation hit Bright Data's
  `Page.navigate domain limit reached` (trial-zone cap) so it **fell back cleanly** - the documented,
  expected outcome (Meta Ad Library is JS-heavy + access-limited; a working fallback is success).

The **committed test suite stays fully mocked + offline**: `puppeteer-core` and `fetch` are mocked,
no live calls. New `scraping-browser.test.ts` (pure parsers + the browser->unlocker->fixtures fallback
chain) plus extended `brightdata.test.ts` (live request shape + a **recorded** real SERP sample) and
`providers.test.ts` (ad-card path + fallback).

Verification (fresh run): `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npm test`
(**408 passing**, 45 files - up from 390; +18 across `scraping-browser.test.ts` and the brightdata /
providers additions), `npm run build` (**success** - `puppeteer-core` is server-only, no client leak).
Dep added: `puppeteer-core@25.2.1` (pinned exact; WS client only, no Chromium download). Committed as
Conventional Commits and pushed to `origin/main`. **Real Bright Data data is now active.**

**Next:** Wave 6 (cont.) - Ship: Vercel deploy + README (3 answers) + demo walkthrough + perf pass.

**Wave 6 (final) - Ship: DONE, deployed, committed.**

Deployed to Vercel production at **https://mediaos-kappa.vercel.app**. Wrote the submission README
(3 required questions answered, demo walkthrough, architecture, tech stack, running locally, env
vars table). Updated `.vercelignore` (excludes `Reference-repo/`, `Docs/`, `scripts/`, `.cursor/`,
`/supabase/` - the leading `/` prevents matching `src/lib/supabase/`). Set all 16 env vars on
Vercel production. Build succeeded on Vercel (Turbopack, Next.js 16.2.9). Final gate fresh:
`tsc` (0), `lint` (0), `npm test` (**418 passing**, 46 files), `npm run build` (success).
Committed as Conventional Commits and pushed to `origin/main`.

**ALL WAVES COMPLETE. SHIPPED.**

---

## Build Wave Plan + File-Claim Map

Waves group work that can proceed in parallel. **Each module owns its directories** (the file-claim
map) so parallel agents don't collide. Shared foundation files (`src/lib/errors.ts`,
`resilience.ts`, `env.ts`, `research/standard-models.ts`, `agent/types.ts`) are **frozen contracts** -
extend via new files, don't rewrite. Serialize all git operations (one committer at a time).

| Wave | Module (plan id) | Owns (file-claim) | Depends on |
|---|---|---|---|
| **0** | Foundation | (done) `src/lib/*` contracts, `supabase/`, shell | - |
| **1** | (done) Operator core (`agent-core`) | `src/lib/agent/runtime.ts`, `src/app/(dashboard)/operator/**`, `src/components/agent/**`, `src/app/api/agent/**` | Wave 0 |
| **1** | (done) Research core (`research-core`) | Bright Data transport in `src/lib/research/brightdata.ts`, `src/lib/research/providers/_shared/**` | Wave 0 |
| **2** | (done) Research providers + AI (`research-providers`, `research-ai`) | `src/lib/research/providers/**`, `analyzer` impl behind `setResearchAnalyzer` | Wave 1 research-core |
| **2** | (done) Research UI (`research-ui`) | `src/components/research/**`, `src/app/(dashboard)/research/**` | Wave 1 |
| **2** | (done) Agent tools (`agent-tools`) | `src/lib/agent/tools/**` (register research first) | Wave 1 |
| **3** | Campaigns (`campaigns`) | `campaign.service` impl, `src/components/campaign/**`, `src/app/(dashboard)/campaigns/**` | Wave 2 |
| **3** | Creative Studio (`creative-*`) | `creative.service` impl, `src/components/creative/**`, `src/app/(dashboard)/creatives/**`, `creative-images` storage | Wave 2 |
| **4** | (done) Landing Pages (`landing-*`) | `landing.service` impl, `src/lib/landing/**`, `src/components/landing-page/**`, `src/app/(dashboard)/landing-pages/**`, `src/app/lp/**`, `src/app/api/leads`, `src/app/api/page-views` | Wave 3 |
| **4** | (done) Performance Intelligence (`analytics-*`) | `analytics.service` impl, `src/lib/analytics/**`, `src/lib/seed/**`, `src/components/analytics/**`, `src/app/(dashboard)/analytics/**` | Wave 3 |
| **5** | Agent orchestration + demo seed + integration | `src/lib/seed/**`, cross-module wiring, command palette, a11y | Waves 2-4 |
| **6** | Ship | Vercel deploy, README (3 answers), demo walkthrough, perf pass | Wave 5 |

---

## Definition of Done (per module)

A module is **not done** until all of the following are true (evidence shown, not assumed):

1. **Code** - implemented to the staff-engineer bar; typed; external calls wrapped in
   `withRetry`/`withTimeout` and throwing typed `AppError`s; secrets server-side; RLS respected.
2. **Tests** - unit/integration written and **passing on a fresh `npm test`**; CI-safe (no network,
   deterministic, Bright Data + AI mocked/fixtured). E2E extended for golden-path-affecting work.
3. **Docs** - relevant `Docs/` page updated in the **same change** (no drift) + a `learnings.md`
   entry for any gotcha.
4. **Quality gates** - `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` all green.
5. **Git** - atomic Conventional Commit(s), pushed to `origin`.

---

## Decisions Log

| # | Decision | Where |
|---|---|---|
| D1 | Next.js 16 (superset of plan's 15); React 19.2; Tailwind v4; Zod v4; AI SDK v7 | [ADR 0001](./adr/0001-tech-stack.md) |
| D2 | shadcn **base-nova** -> Base UI (not Radix) | [ADR 0001](./adr/0001-tech-stack.md), learnings |
| D3 | Research engine = OpenBB TET provider abstraction + registry + orchestrator | [ADR 0002](./adr/0002-research-provider-abstraction.md) |
| D4 | RLS: owner-scoped (denormalized `user_id`) + public deployed-page read + anonymous insert via deployed-page join; path-scoped storage | [ADR 0003](./adr/0003-rls-strategy.md) |
| D5 | Agent = typed tool registry + Zod-validated `defineTool` + plan/execute/observe loop | [ADR 0004](./adr/0004-agent-runtime.md) |
| D6 | Test stack = Vitest (unit/integration, node env) + Playwright (e2e) | this build |
| D7 | App boots without credentials (lazy env, `is*Configured()`), degrading gracefully | `src/lib/env.ts` |
| D8 | DB Row/Insert/Update shapes are `type` aliases (not `interface`s) so `SupabaseClient<Database>` infers table types - no per-module remap casts | `src/types/database.ts`, [learnings](./learnings.md) |
| D9 | Bright Data zones centralized + optional, now **live-validated + wired**: Web Unlocker `mcp_unlocker`, SERP `serp_api1` (`brd_json=1` -> JSON), Scraping Browser WSS (`BRIGHTDATA_BROWSER_WS`) driven by `puppeteer-core` in `scraping-browser.ts` | `src/lib/env.ts`, `src/lib/research/scraping-browser.ts` |
| D10 | Operator runs demo-mode without credentials; Research degrades via a 3-layer fallback (live -> enriched -> seeded fixtures) | `src/lib/agent/**`, `src/lib/research/**` |

---

## Risks & Open Questions

| Status | Item | Mitigation / Note |
|---|---|---|
| OPEN | Bright Data Pro (`web_data_*`) may be inactive | Engine degrades to verified free-tier search+scrape; Pro providers gated by `isAvailable()` |
| RESOLVED | Azure image API surface | Foundry v1 needs **no `api-version`** query param; image is `/mai/v1/images/generations` with `output_format: image/png`. LIVE-validated 2026-06-30 (learnings) |
| PARTIAL | Are real credentials in `.env.local`? | **Azure + Bright Data live-validated** (`npm run smoke:azure`, `smoke:brightdata`, `smoke:browser` all green); still verify Supabase before live demo / seed |
| RESOLVED | Bright Data Scraping Browser wiring | **Wired + LIVE-validated 2026-06-30:** `scraping-browser.ts` (`puppeteer-core` over WSS) drives competitor-ads with a browser->unlocker->fixtures fallback; live SERP (`brd_json=1` -> JSON) + Unlocker round-trip confirmed |
| KNOWN | Meta Ad Library live extraction | JS-heavy + access-limited (live hit `Page.navigate domain limit reached`); provider falls back to Unlocker markdown -> seeded fixtures. A clean fallback is the accepted outcome |
| OPEN | Demo seed realism (90-day analytics) | `analytics-seed` phase: fatigue curves, seasonality, platform behaviors |
| RESOLVED | Git remote | `origin` exists -> https://github.com/Adit-Jain-srm/MediaOS (branch `main`) |
| RESOLVED | Reference repo leaking into build | Excluded in `.gitignore`, `tsconfig`, `eslint`, `.vercelignore` |

---

## Carry-Forward (must address in a later wave)

- **Canonical demo identity (Wave 6 demo-seed). DONE 2026-06-30.** Created `src/lib/seed/constants.ts`
  as the single source of truth for all demo ids (`DEMO_CAMPAIGN_ID`, `DEMO_USER_ID`,
  `DEMO_RESEARCH_PROJECT_ID`, `DEMO_CREATIVE_IDS`, `DEMO_LANDING_IDS`, `DEMO_LANDING_SLUG`). Every
  module store (campaign, creative, landing, research, analytics, agent tools) now imports from this
  file. The research project links to the campaign via `campaignId`. The analytics "adoption bridge"
  reduced to a fallback. The Command Center shows real stats for the canonical campaign. Error boundary
  wraps the dashboard shell. Command palette registers all module actions. Integration test validates
  cross-module id consistency. All 418 tests pass, build succeeds.
- **Azure AI Foundry client adaptation (Wave 6). DONE + LIVE-VALIDATED 2026-06-30.** `src/lib/ai/azure.ts`
  + `src/lib/env.ts` now target the Foundry **OpenAI-compatible `v1` surface** (chat via
  `@ai-sdk/openai` `provider.chat("gpt-5.3-chat")` chat-completions; image via `Authorization: Bearer`
  POST to `/mai/v1/images/generations` with `output_format: image/png`, parsing `data[0].b64_json`).
  Both models confirmed responding (`npm run smoke:azure`); exported signatures unchanged; committed
  suite stays mocked/offline. See [azure-models](./azure-models.md) + [learnings](./learnings.md).
- **Bright Data Scraping Browser wiring (Wave 6). DONE + LIVE-VALIDATED 2026-06-30.** `scraping-browser.ts`
  drives `puppeteer-core` over the remote WSS endpoint with a leak-guarded connect + bounded
  timeout/retry; competitor-ads resolves Meta Ad Library cards via **Scraping Browser -> Web Unlocker
  markdown -> seeded fixtures**. Live SERP (`brd_json=1` returns JSON) + Unlocker round-trip confirmed;
  browser WSS connect/navigate confirmed (`example.com` title). Meta Ad Library live extraction falls
  back cleanly (access-limited). Committed suite stays mocked/offline. See [research-engine](./research-engine.md)
  + [learnings](./learnings.md).
  - *(optional, not done)* `social` provider could also adopt the Scraping Browser; left as-is to keep
    scope bounded and signatures stable.

---

## Change Log

- **2026-06-28** - Wave 0 Foundation baselined: scaffold + tooling, Supabase schema/design
  system/shared contracts, Vitest+Playwright test harness (35 unit tests passing), and full `Docs/`
  set (architecture, ADRs 0001-0004, research-engine, api, runbook, learnings, progress). Committed
  as Conventional Commits and pushed to `origin/main`. See `git log --oneline` for hashes.
- **2026-06-28** - Wave 2 integrated: **Audience Research Intelligence Engine** + **Operator agent**
  (built by two parallel workers) merged in one pass. Fixed the central `Database` typing defect (Row
  shapes -> `type` aliases) so `SupabaseClient<Database>` infers table types, and removed the duplicated
  per-module remap casts; removed the leftover Operator-rail placeholder footer; centralized the Bright
  Data zone env vars. Full gate re-run fresh: `tsc` (0), `lint` (0), `npm test` (**122 passing**, 16
  files), `npm run build` (success). Committed as Conventional Commits and pushed to `origin/main`.
- **2026-06-28** - Wave 3 integrated: **Campaigns** + **Creative Studio** (built by two parallel
  workers) merged in one pass. Full gate re-run fresh: `tsc` (0), `lint` (0), `npm test` (**237
  passing**, 29 files), `npm run build` (success) - **no build-only fixes required** (both workers'
  Server/Client boundaries were already clean). Bright Data is now **live-configured** (Web Unlocker
  `mcp_unlocker`, SERP `serp_api1`, Scraping Browser WSS in env, not yet wired into code). Committed as
  Conventional Commits and pushed to `origin/main`. Next: Wave 4 (Landing Pages + Analytics).
- **2026-06-30** - Wave 4 integrated: **Landing Pages** + **Performance Intelligence (Analytics)**
  (built by two parallel workers) merged in one pass. Full gate re-run fresh: `tsc` (0), `lint` (0),
  `npm test` (**337 passing**, 42 files), `npm run build` (success - the real integration gate that
  neither worker had run) - **no build-only fixes required** (clean Server/Client boundaries; `/lp/[slug]`
  dynamically server-rendered; `/api/leads` + `/api/page-views` route handlers resolve cleanly). This
  completes **all five product modules + the Operator agent**. Logged two learnings (`URL.origin` is the
  string `"null"` for non-HTTP schemes -> the referrer-cleaning fix; per-module independent demo seeding
  drifts campaign ids apart -> need a canonical Wave 6 seed) and a Carry-Forward note. Committed as
  Conventional Commits and pushed to `origin/main`. Next: Wave 5 (Agent tool-wiring + Bright Data
  Scraping Browser + live-data validation).
- **2026-06-30** - Wave 5 integrated (Operator tool-wiring + end-to-end orchestration): **17 typed,
  Zod-validated, fail-safe module tools** wrapping every module service, registered idempotently via
  `registerModuleTools()`; the system prompt now teaches the **golden path** (research → campaign →
  creatives → landing → analytics), the runtime step budget was raised to 16, demo mode runs a scripted
  golden path offline, and rich per-type **artifact cards** + `proactive_briefing`/`suggestionsFromArtifacts`
  wire the improvement loop. Committer/integration gate re-run fresh: `tsc` (0), `lint` (0), `npm test`
  (**376 passing**, 43 files - up from 337), `npm run build` (**success** - the real gate the capstone
  worker had not run) - **no build-only fixes required** (server/client boundary already clean: tool
  `execute` stays server-side, artifacts mapped to flat shapes in PURE `tools/artifacts.ts`, client
  registry renders cards). Added `Docs/operator-tools.md`, an ADR 0004 addendum, and `Docs/azure-models.md`
  (Azure AI Foundry v1 surface - **env wired, code NOT wired**, deferred to Wave 6). Committed as
  Conventional Commits and pushed to `origin/main`. Next: Wave 6 - Azure AI Foundry client adaptation +
  live validation, then Bright Data Scraping Browser + live-data validation, then canonical demo seed,
  integration/polish, ship.
- **2026-06-30** - Wave 6 (part 1) integrated: **Azure AI Foundry client adaptation + LIVE validation**.
  Rewired `src/lib/ai/azure.ts` from classic Azure OpenAI (`@ai-sdk/azure`, `api-key` header) to the
  Foundry **OpenAI-compatible v1 surface** - chat via `@ai-sdk/openai` `createOpenAI({ baseURL, apiKey })`
  + `provider.chat("gpt-5.3-chat")` (chat-completions; `CHAT_TRANSPORT` flips to Responses if needed),
  image via `Authorization: Bearer` POST to `/mai/v1/images/generations`
  (`output_format: image/png`, parse `data[0].b64_json`). Added the new optional env keys + `preview`
  default and tightened `isAzureConfigured()`; **all exported signatures unchanged** (no consumer edits).
  Dep `@ai-sdk/openai@4.0.2` (exact pair for `ai@7.0.4`). **LIVE-validated** both models with the real
  key (`npm run smoke:azure`, creds-gated, not in CI): chat -> `"ok"`, image -> valid base64 PNG.
  Live findings vs. docs: image endpoint is `/mai/v1/...` (the `/openai/v1/...` form 404s on generation)
  and `output_format` must be MIME `image/png`; `gpt-5.3-chat` is treated as a reasoning model so
  `temperature` is dropped (graceful). Full gate fresh: `tsc` (0), `lint` (0), `npm test` (**390
  passing**, 44 files), `npm run build` (success). Committed/pushed to `origin/main`. **Real AI is now
  active.**
- **2026-06-30** - Wave 6 (part 2) integrated: **Bright Data live data + Scraping Browser**. Live
  round-trip proved `brightdata.ts` already matches the API - **no parser change needed**: on zone
  `serp_api1`, `brd_json=1` returns parsed JSON (`organic[]` = `{title,link,description,rank}`,
  `related`), and the Web Unlocker returns markdown. Added `scraping-browser.ts` - a leak-guarded
  `withScrapingBrowser(fn)` that connects `puppeteer-core` to the remote `BRIGHTDATA_BROWSER_WS` (pure
  WS client, serverless-safe; **dynamically imported** so it's server-only + out of the client bundle)
  with bounded timeout + retry, returning `null` on any failure. Wired competitor-ads to a
  **Scraping Browser -> Web Unlocker markdown -> seeded fixture** chain (never throws; signatures
  unchanged). **LIVE-validated** (creds-gated, not in CI): `npm run smoke:brightdata` -> 9 organic + 8
  related results + real Unlocker markdown; `npm run smoke:browser` -> WSS connect + `example.com` title
  `"Example Domain"` (Meta Ad Library navigation hit the trial `Page.navigate domain limit reached` ->
  clean fallback, as expected). Committed suite stays **mocked/offline** (`puppeteer-core` + `fetch`
  mocked; recorded real SERP sample). Dep `puppeteer-core@25.2.1` (pinned exact, no Chromium). Full
  gate fresh: `tsc` (0), `lint` (0), `npm test` (**408 passing**, 45 files), `npm run build`
  (**success** - server-only, no client leak). Committed/pushed to `origin/main`. **Real Bright Data
  data is now active.**
- **2026-06-30** - Wave 6 (part 3) integrated: **Canonical Demo Seed + Integration Polish**.
  Established `src/lib/seed/constants.ts` as the ONE source of truth for all demo ids - every module
  (campaign, creative, landing, research, analytics, agent tools) now imports from this single file.
  The research project links to the campaign via `campaignId`. Rebuilt the **Command Center** (`/`)
  page to show the demo campaign card with live stats (impressions, clicks, conversions, spend) and
  quick-links to each module filtered by campaign id. Added a **top-level error boundary** in the
  dashboard shell (catches unhandled client errors, never white-screens). Registered all module
  routes + key actions (new campaign, new research, open operator, view creatives/landing/analytics) in
  the **command palette**. Added `demo-seed.ts` with `validateDemoSeedConsistency()` (verifies all
  module fixtures reference the canonical ids) and `getDemoSeedIdentity()`. Full gate fresh: `tsc` (0),
  `lint` (0), `npm test` (**418 passing**, 46 files - up from 408), `npm run build` (success).
  Committed as Conventional Commits and pushed to `origin/main`. **Canonical demo is now coherent.**
- **2026-06-30** - Wave 6 (final) - **Ship**: Deployed to Vercel production at
  `https://mediaos-kappa.vercel.app`. Wrote the submission README (3 required questions, demo
  walkthrough, architecture, tech stack, running locally, env vars). Updated `.vercelignore` to
  exclude non-runtime dirs without matching `src/lib/supabase/`. Set all 16 env vars on Vercel
  production via CLI. Vercel build green (Turbopack, Next.js 16.2.9, all routes resolved). Final
  gate fresh: `tsc` (0), `lint` (0), `npm test` (**418 passing**, 46 files), `npm run build`
  (success). Committed/pushed to `origin/main`. **ALL WAVES COMPLETE. SHIPPED.**
- **2026-07-01** - Delight Sprint Phase 1: Added motion design tokens (duration/easing CSS custom
  properties with prefers-reduced-motion fallbacks), shadow depth system (depth-1/2/3 + glow-primary
  + ring-pulse + scroll-progress), and enabled native View Transitions (experimental.viewTransition
  in next.config.ts with fade-in/out CSS). Gate: tsc (0), test (418 pass), build (success).
- **2026-07-01** - Delight Sprint (Phases 1-7 complete): Motion design tokens (CSS custom properties
  with reduced-motion fallbacks), shadow depth system, native View Transitions (experimental.viewTransition),
  spring-physics buttons (motion.button with whileHover/whileTap), TiltCard on Command Center,
  sidebar emerald glow + spring indicator, SlideUp on Operator chat messages, ShimmerSkeleton in all
  loading states, AgentRail slide-in animation, procedural UI sounds (Web Audio API, opt-in),
  CountUp on analytics metric-cards, typing dots indicator, Recharts animation tuning (800->400ms),
  sidebar icon hover animations, metric label tooltips, product-specific loading messages, and
  CSS scroll-driven progress bar. All gated behind prefers-reduced-motion. Gate: tsc (0), test
  (418 pass), build (success). Total new JS: <5KB (no external deps added).

---

**Wave 7 — Track 01: AI Growth & Agentic Commerce (Razorpay AI Buildathon)**

Status: **IN PROGRESS**

Objective: Upgrade MediaOS from an AI media buyer into a full Track 01 growth + agentic-commerce
system. Razorpay test-mode money loop, campaign orchestrator with a bounded ₹ objective,
conversational + catalog checkout, upsell/cross-sell, AP2-style mandates, audit trail, and graceful
failure. Production quality, no deadline-driven cuts.

Plan: `.cursor/plans/track_01_upgrade_96eff3ff.plan.md`
Execution rule: `.cursor/rules/track-01-execution.mdc`
ADR: [ADR 0005](./adr/0005-razorpay-money-loop.md) (Proposed)
Docs pack: [Docs/buildathon/](./buildathon/)

Phases 0–10, each with: implement → self-review → tests → gate → docs → commit → push.

File-claim map, schema, API routes, policy engine, tool catalog, and failure matrix: see
[upgrade-spec](./buildathon/upgrade-spec.md).

### Wave 7 Change Log

- **2026-09-01** — Phase 0: Docs pack + execution rule. Created `.cursor/rules/track-01-execution.mdc`
  (always-apply, sequential, production-grade, goal-aware, skill-driven). Created `Docs/buildathon/`
  (8 files: README, hackathon-brief, track-01-bar, gap-analysis, product-reframe, upgrade-spec,
  protocols, submission-draft). Added ADR 0005 (Proposed). Added stub `Docs/payments.md`. Added this
  Wave 7 section to progress.md.   Gate: `tsc` (0), `lint` (0), `npm test` (**419 passing**, 46 files),
  `npm run build` (success). Committed and pushed to `origin/main`.
- **2026-09-02** — Phase 1: Schema + env + error taxonomy. Migration
  `0003_razorpay_money_loop.sql` (7 tables: products, mandates, orders, order_items, payments,
  audit_events, webhook_receipts — bigint paise, RLS, indexes). `env.ts`: 3 Razorpay keys +
  `isRazorpayConfigured()` + `isRazorpayWebhookConfigured()` + `getServiceConfigStatus().razorpay`.
  `errors.ts`: service `razorpay`, codes `POLICY_DENIED`/`SIGNATURE_INVALID`/`PAYMENT_FAILED`.
  `database.ts`: type aliases + Database entries for all 7 tables. 6 new env tests. Gate: `tsc` (0),
  `lint` (0), `npm test` (**425 passing**, 46 files), `npm run build` (success). Committed and pushed.
