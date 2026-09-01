# Audience Research Intelligence Engine

The research engine is MediaOS's moat: an OpenBB-inspired **"connect once, consume everywhere"**
system that aggregates live web data into a single, normalized, citation-rich result, then
synthesizes it into personas and opportunities. This page is the engineering reference - the
contract, the moving parts, the real Bright Data integration, graceful degradation, persistence,
and a step-by-step guide to adding a new provider.

Design rationale: [ADR 0002](./adr/0002-research-provider-abstraction.md). Source:
`src/lib/research/`.

---

## 1. The pieces

| File | Role |
|---|---|
| `standard-models.ts` | The provider-agnostic contract. Zod schemas + inferred types for `AudienceSegment`, `CompetitorAd`, `TrendSignal`, `CommunityInsight`, `PainPoint`, `BuyingTrigger`, `Opportunity`, `SourceCitation`, `QueryParams`, the tagged `StandardModel` union, the merged `ResearchResult`, and the enriched `ResearchReport`. |
| `provider.ts` | The `ResearchProvider` abstract class (the TET Fetcher) + `run()` wrapper. |
| `registry.ts` | `ResearchProviderRegistry` + the shared `researchRegistry` singleton. |
| `providers/*.ts` | The six built-in providers + `ensureProvidersRegistered()` bootstrap + shared pure `utils.ts`. |
| `brightdata.ts` | Real HTTP `BrightDataClient` (SERP + Web Unlocker) with retry/timeout, read-through cache, and fixture fallback. |
| `analyzer.ts` | The Azure GPT-4o `ResearchAnalyzer`: persona synthesis, pain-point ranking, buying-trigger detection, opportunity detection - zod-validated, with seeded fallback. |
| `orchestrator.ts` | `runResearch()` (parallel + streaming), `mergeProviderResults()` (pure merge), and `runResearchPipeline()` (providers + analyzer → `ResearchReport`). |
| `store.ts` | Persistence + project lifecycle. Supabase (RLS) when configured, in-memory fallback otherwise. |
| `service.ts` | The application service used by server actions + the API route (create/list/get/run/persist). |
| `fixtures/` | Seeded financial-newsletter vertical data (standard models + SERP/scrape) for fallback **and** tests. |

UI lives in `src/components/research/*` and `src/app/(dashboard)/research/*`; the streaming endpoint
is `src/app/api/research/run/route.ts`.

---

## 2. The provider contract (TET)

Every source implements the same **Transform → Extract → Transform** pipeline:

```ts
abstract class ResearchProvider<Q extends ProviderQuery, D extends StandardModel> {
  abstract readonly name: string;                          // registry id (unique)
  abstract readonly title: string;                         // UI label
  abstract readonly description: string;
  abstract readonly produces: ReadonlyArray<StandardModelKind>;
  readonly tier: "free" | "pro" = "free";

  abstract transformQuery(params: QueryParams): Q | Promise<Q>;          // T
  abstract extractData(query: Q, ctx: ProviderRunContext): Promise<RawData>; // E (Bright Data)
  abstract transformData(raw: RawData, params: QueryParams): NormalizedOutput<D> | Promise<NormalizedOutput<D>>; // T

  isAvailable(): boolean { return true; }                  // override for Pro-gated sources
  run(params, ctx?): Promise<ProviderResult>;              // runs TET; never throws
}
```

`run()` times the pipeline and **never throws**: on error it returns
`{ provider, items: [], sources: [], status: "failed", error }`, so one bad source can't break an
orchestrated run.

> TET typing note: declare each provider's query shape with a `type` alias, not an `interface`.
> `interface`s lack an implicit index signature and fail the `Q extends ProviderQuery`
> (`Record<string, unknown>`) constraint.

### Standard models carry citations

Every emitted item is a tagged `StandardModel` - `{ kind: "pain_point", data: PainPoint }`, etc. -
and every `data` carries `sources: SourceCitation[]`. This is what lets the UI and the Operator
attribute each claim to a real source.

---

## 3. Registry, orchestrator, and the full pipeline

```ts
// Register the six built-ins (idempotent - safe to call per request):
ensureProvidersRegistered();

// Run providers in parallel, stream each result, then synthesize:
const report = await runResearchPipeline(
  { query: "near-retirees worried about inflation", region: "us", limit: 25 },
  { onProviderResult: (r) => pushToUI(r) },
);
```

- `runResearch(params, options)` selects providers (explicit `options.providers`, else
  `registry.available()`), runs them with `Promise.all`, fires `onProviderResult` per completion for
  progressive streaming, then merges.
- `mergeProviderResults(params, results)` is a **pure** function that buckets tagged items into the
  aggregated `ResearchResult` (segments, competitorAds, trends, communityInsights, painPoints,
  buyingTriggers), concatenates `sources`, and records a `providerRuns` summary - trivially
  unit-testable with fixtures.
- `runResearchPipeline(params, options)` = `ensureProvidersRegistered()` → `runResearch()` → the
  `ResearchAnalyzer` (personas, ranked pains, triggers, opportunities) → a citation-rich
  `ResearchReport`. It never throws for missing credentials.

---

## 4. Bright Data HTTP integration (real, Vercel-safe)

The deployed app runs on Vercel and **cannot** use Cursor's MCP, so `brightdata.ts` is a real HTTP
client to Bright Data's API at `POST https://api.brightdata.com/request`, authorized with
`BRIGHTDATA_API_TOKEN`.

| Method | Bright Data product | How |
|---|---|---|
| `searchEngine` / `searchEngineBatch` | SERP API / Web Unlocker | Builds a search-engine URL with `brd_json=1` (e.g. `https://www.google.com/search?q=…&brd_json=1&gl=us`) and parses the returned SERP JSON (`organic`, `related`, `people_also_ask`). |
| `scrapeAsMarkdown` / `scrapeBatch` | Web Unlocker | Sends `{ zone, url, format: "raw", data_format: "markdown" }`. |
| `webData(dataset, …)` | Pro structured datasets | Returns `null` by default (Pro off) so callers degrade to search + scrape. |

**Zones** (read from the environment, with sensible defaults so it boots un-configured):
`BRIGHTDATA_WEB_UNLOCKER_ZONE` (default `mcp_unlocker`) and `BRIGHTDATA_SERP_ZONE` (defaults to the
unlocker zone).

> **`brd_json` finding (live-validated 2026-06-30, zone `serp_api1`).** Appending `brd_json=1` to a
> Google search URL returns **parsed JSON** (`content-type: application/json`), top-level keys
> `general, input, navigation, organic, top_ads, pagination, related`, with `organic[]` items shaped
> `{ title, link, description, rank }` - **exactly** what `parseSerpJson` reads, so no parser change
> was needed. A real query (`"retirement income newsletter"`) returned 9 organic + 8 related results;
> the Web Unlocker returned clean markdown. Re-verify any time with the creds-gated
> `npm run smoke:brightdata` (NOT in CI).

**Resilience (every call):**

1. **Retry + timeout** via `@/lib/resilience` (`withRetry`, exponential backoff, 25s budget).
2. **Read-through cache** (in-memory, TTL + size-bounded) keyed by engine/country/query and by URL,
   so the same fetch in a session is not repeated.
3. **Graceful degradation** - on a missing/invalid token, a network error, a non-200, a parse
   failure, *or an empty live result set*, the client logs a structured warning and returns **seeded
   fixture data**. It **never throws to the UI**.

The architecture is two layers: `HttpBrightDataClient` (faithful HTTP, throws typed errors) wrapped
by `ResilientBrightDataClient` (cache + fixture fallback, never throws). `getBrightDataClient()`
returns the resilient client; `setBrightDataClient()` injects a fake for tests/seeders (no live calls
in CI).

---

## 4b. Scraping Browser (JS-heavy pages)

Some sources (the Meta Ad Library, infinite-scroll social feeds) render their content with client-side
JavaScript, so a plain Web Unlocker markdown pull returns an empty shell. For those, `scraping-browser.ts`
drives a **remote** Chromium over Bright Data's Scraping Browser via a WebSocket endpoint
(`BRIGHTDATA_BROWSER_WS`). It is a pure **WS client** - there is **no local Chromium download** - so it
runs unchanged on Vercel serverless (Node runtime).

| Export | Role |
|---|---|
| `withScrapingBrowser(fn, opts?)` | Connects `puppeteer-core` to the WSS endpoint, runs `fn(page)`, and **always** closes the page + disconnects. Bounded timeout + retry; **leak-guarded** `connect` (disconnects even if `connect` resolves after the deadline). Returns `fn`'s result, or **`null`** (never throws) when the endpoint is unset or any step fails. |
| `fetchMetaAdLibraryCards(query, country, opts?)` | Navigates the live Meta Ad Library and extracts visible ad cards via `withScrapingBrowser`; returns `null` when unavailable/empty. |
| `metaAdLibraryUrl(query, country)` | Builds the Ad Library keyword-search URL (country upper-cased). |
| `parseMetaAdCards(rawTexts)` / `parseAdCardsFromMarkdown(md)` | Pure, unit-tested parsers (browser DOM text and Unlocker markdown → `ScrapedAdCard[]`). |

Key engineering choices:

- **`puppeteer-core` is dynamically imported** (`await import("puppeteer-core")`) inside the helper, so
  it is only loaded when a browser endpoint is configured - keeping it **server-only** and **out of the
  client bundle** (the `type`-only import of `Browser`/`Page` is erased at compile time). Import this
  module only from server code (providers, server actions, Node-runtime route handlers).
- The endpoint is read from `process.env.BRIGHTDATA_BROWSER_WS` at call time (so it's independently
  testable and the offline suite can exercise the pure parsers + fallback chain).

**Fallback chain (competitor-ads, never throws):**

```
Scraping Browser (live Meta Ad Library)
   └─ null/empty ─▶ Web Unlocker markdown of the Ad Library URL
                        └─ upstream failure ─▶ seeded ad-library fixture (via the resilient client)
```

> **Meta Ad Library reality.** The markup is messy, JS-heavy, and access-limited. Live, the Scraping
> Browser **connects and navigates** fine (`example.com` title verified via `npm run smoke:browser`),
> but a Meta Ad Library navigation can hit Bright Data's `Page.navigate domain limit reached` on a
> trial zone. The provider then degrades cleanly down the chain - **a working fallback is the accepted
> outcome**; we capture whatever structured signal (advertiser + ad copy) we can and never block.

---

## 5. The six providers

Each extends `ResearchProvider`, normalizes to the standard models, and is registered by
`ensureProvidersRegistered()`.

| Provider (`name`) | Bright Data tools | Yields |
|---|---|---|
| Competitor Ad Research (`competitor_ads`) | `search_engine` + **Scraping Browser → Web Unlocker → fixture** chain for the Meta Ad Library (see §4b) | `competitor_ad` - advertiser, copy, classified hooks |
| Search Intent (`search_intent`) | `search_engine_batch` (related + people-also-ask) | `trend_signal` (rising demand) + `buying_trigger` (intent questions) |
| Reddit & Community (`reddit_community`) | `web_data_reddit_posts` (Pro) → `search_engine` + `scrape_as_markdown` | `community_insight` + `pain_point` (audience's own words) |
| News & Industry (`news_industry`) | `search_engine_batch` (+ scrape) | `trend_signal` (market shifts, headlines) |
| Social Listening (`social_listening`) | `web_data_x_posts`/`tiktok_posts` (Pro) → `search_engine` | `community_insight` + `trend_signal` (formats, share of voice) |
| Web Intelligence (`web_intel`) | `search_engine` + `scrape_batch` | `competitor_ad` (positioning) + `buying_trigger` (lead-magnet CTAs) |

Pro `web_data_*` tools are attempted first where relevant and **degrade to search + scrape** when Pro
is unavailable (the verified free-tier path). Hook classification, platform inference, sentiment, and
markdown extraction live in pure, unit-tested helpers (`providers/utils.ts`).

---

## 6. AI analysis layer (Azure GPT-4o)

`AiResearchAnalyzer` (`analyzer.ts`) turns the merged data into actionable intelligence:

- `synthesizePersonas` - rich `AudienceSegment`s (demographics, psychographics, behaviors, platform
  prefs) grounded in the data, via `generateChat` with a strict JSON system prompt.
- `extractPainPoints` / `detectBuyingTriggers` - ranked + deduped from the cited provider output.
- `detectOpportunities` - high-pain/low-competition, pre-saturation trends, messaging gaps.

**Trust + resilience:** every model response is JSON-extracted (`extractJsonBlock`) and **zod-validated**
before it is trusted; invalid output falls back rather than propagating. The model is **not** asked
to invent citations - the analyzer attaches real provider `SourceCitation`s to each synthesized
insight. When Azure is unconfigured (or a call/parse fails), the analyzer returns **high-quality
seeded output derived from the providers' raw data** so the product still demos. It is injectable via
`get/setResearchAnalyzer`.

---

## 7. Persistence + project lifecycle

`store.ts` exposes a `ResearchStore` (create/list/get project, save/get report, set status, delete)
with two implementations, chosen at runtime by `getResearchStore()`:

- **Supabase (RLS)** when configured and a user is signed in. `saveReport` writes the normalized rows
  (`audience_personas`, `competitor_ads`, `trend_signals`, `community_insights`) plus citations into
  `research_sources`, and a single lossless **snapshot row** (`provider = "_snapshot"`,
  `raw_data = the full report`) so a reload restores the report exactly. Re-runs are idempotent
  (child rows are cleared first).
- **In-memory** otherwise, so the engine fully works with **zero credentials**. It seeds one demo
  project ("Retirement Income Weekly") from the fixtures so `/research` is never empty.

Persistence is always **best-effort**: a write failure is logged and degraded, never thrown to the
UI. `QueryParams` is stored in the project's `query` text column as JSON to preserve re-run context.

> Supabase typing gotcha: the hand-authored `interface` row types in `@/types/database` lack an
> implicit index signature and make `SupabaseClient<Database>` resolve every table to `never`. The
> store re-maps the table types through a homomorphic mapped type and casts once (mirroring the agent
> module). Structurally identical, zero runtime effect.

---

## 8. Server actions + streaming API

- **Server actions** (`src/app/(dashboard)/research/actions.ts`): `createResearchProjectAction`,
  `deleteResearchProjectAction`, and a non-streaming `runResearchProjectAction` fallback. All inputs
  are zod-validated.
- **Streaming run** (`src/app/api/research/run/route.ts`, `POST`): returns **NDJSON** so the
  workspace renders progressively. Events: `start`, `provider` (one per provider as it completes),
  `report` (the synthesized report), `done`, and `error`. Persistence happens server-side. The route
  never throws to the client - failures are emitted as `error` events.

The workspace (`research-workspace.tsx`) consumes the stream, updates the provider status strip live,
and falls back to the server action if streaming is unavailable.

---

## 9. Seeded fixtures & graceful degradation

`fixtures/` contains a realistic **financial-newsletter** vertical ("retirement income newsletter
targeting near-retirees worried about inflation"): competitor ads in DR style, Reddit pain points in
the audience's own words, rising trends, buying triggers, personas, and opportunities - plus
Bright-Data-shaped SERP/scrape responses routed by intent keywords (`matchFixtureSearch` /
`matchFixtureScrape`). They serve two roles:

1. **Live-call fallback** at three layers - Bright Data (no/failed token → fixture SERP/scrape, run
   through the *real* `transformData`), Azure (no/failed key → seeded/derived personas), and Supabase
   (unconfigured → in-memory store). The engine returns a compelling report with **no credentials**.
2. **Deterministic tests** - providers, the merge, the pipeline, and the analyzer are all exercised
   offline.

`buildSeededReport()` assembles the full `ResearchReport` from the curated fixtures.

---

## 10. How to add a new provider

Adding a data source is a localized change - the core, orchestrator, merge, persistence, and UI never
change.

1. **Implement the TET pipeline** in `src/lib/research/providers/my-source.ts`:

```ts
import { getBrightDataClient } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import type { QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import { toCitation } from "./utils";

type MyQuery = { queries: { query: string; country: string }[] }; // use `type`, not `interface`

export class MySourceProvider extends ResearchProvider<MyQuery> {
  readonly name = "my_source";
  readonly title = "My Source";
  readonly description = "What it yields.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["trend_signal"];

  transformQuery(params: QueryParams): MyQuery {
    return { queries: [{ query: params.query, country: params.region ?? "us" }] };
  }
  async extractData(query: MyQuery, ctx: ProviderRunContext) {
    const client = getBrightDataClient();
    return { responses: await client.searchEngineBatch(query.queries, { signal: ctx.signal }) };
  }
  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const responses = (raw.responses as { results: { url: string; title?: string }[] }[]) ?? [];
    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];
    for (const res of responses) {
      for (const r of res.results.slice(0, params.limit ?? 10)) {
        const citation = toCitation(this.name, { url: r.url, title: r.title });
        sources.push(citation);
        items.push({ kind: "trend_signal", data: { topic: r.title ?? r.url, timeSeries: [], sources: [citation] } });
      }
    }
    return { items, sources };
  }
}
```

2. **Register it** by adding it to `createBuiltInProviders()` in `providers/index.ts` (picked up by
   `ensureProvidersRegistered()`).
3. **Pro-only sources**: set `readonly tier = "pro"` and override `isAvailable()` until Pro is
   confirmed; gate the `web_data_*` call inside `extractData` with a `null` → search/scrape fallback.
4. **Add fixtures + a test**: extend the fixture matchers for your intent keywords and add a
   `transformData` test using `brightDataFixtures` (no network).

The orchestrator picks the provider up via `registry.available()`, runs it in parallel, and
`mergeProviderResults` files its items into the right `ResearchResult` bucket with their citations.

---

## 11. Environment

| Variable | Purpose | Missing → behavior |
|---|---|---|
| `BRIGHTDATA_API_TOKEN` | Bright Data API auth | Serve seeded SERP/scrape fixtures |
| `BRIGHTDATA_WEB_UNLOCKER_ZONE` | Web Unlocker zone (default `mcp_unlocker`) | Use default |
| `BRIGHTDATA_SERP_ZONE` | SERP zone (default = unlocker zone) | Use unlocker zone |
| `BRIGHTDATA_BROWSER_WS` | Scraping Browser WSS endpoint (JS-heavy pages, §4b) | Skip the browser step, fall back to Web Unlocker → fixtures |
| `AZURE_OPENAI_*` | GPT-4o for synthesis | Seeded/derived personas + heuristic opportunities |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Persistence (RLS) | In-memory store (demo-safe) |

---

## 12. Testing

Vitest, offline and deterministic (no network, mocked AI and Bright Data):

- `providers/utils.test.ts` - hook classification, platform/creative inference, sentiment, markdown extraction.
- `providers/providers.test.ts` - each provider's `transformQuery` + `transformData` on fixtures, and `run()` end-to-end against the fixture client.
- `orchestrator.test.ts` - pure merge + `runResearchPipeline` integration with a deterministic analyzer.
- `analyzer.test.ts` - persona synthesis with a **mocked** `generateChat` (valid/garbage/throw) and the no-Azure fallback; `extractJsonBlock` edges.
- `brightdata.test.ts` - SERP JSON parsing (incl. a **recorded real SERP sample**), the live request
  shape (zone / `brd_json` URL / `raw` format / `data_format: markdown` / bearer auth, with `fetch`
  mocked), fixture fallback (never throws), and read-through caching.
- `scraping-browser.test.ts` - the pure parsers (`parseMetaAdCards`, `parseAdCardsFromMarkdown`,
  `metaAdLibraryUrl`) and the `withScrapingBrowser` / `fetchMetaAdLibraryCards` fallback chain with
  **`puppeteer-core` mocked** (returns null when unconfigured; runs + always disconnects when
  configured; returns null on connect failure or empty extraction - no leaks, no network).
- `standard-models.test.ts` - zod schema defaults and edge cases.

Run: `npm test` (or `npx vitest run src/lib/research`). The committed suite is **fully mocked +
offline**; the **live** round-trips are creds-gated scripts NOT in CI: `npm run smoke:brightdata`
(SERP + Unlocker) and `npm run smoke:browser` (Scraping Browser WSS).
