# Learnings

Dated, append-only log of non-obvious fixes and gotchas. Format: **Problem -> Root cause -> Rule.**
Never repeat a class of mistake twice.

---

## 2026-06-28 - Foundation

### Next.js 16 route-protection middleware is `src/proxy.ts`
- **Problem:** A conventional `src/middleware.ts` exporting `middleware()` did not run.
- **Root cause:** Next.js 16 renames the route-interception convention to **`proxy.ts`** exporting a
  `proxy(request)` function (with the same `config.matcher` shape).
- **Rule:** Put route protection in `src/proxy.ts` / `export async function proxy(...)`. Don't
  reintroduce `middleware.ts`.

### shadcn `base-nova` generates **Base UI**, not Radix
- **Problem:** Components imported from `@radix-ui/*` weren't installed / didn't match generated code.
- **Root cause:** We use the shadcn **`base-nova`** registry, which builds on **Base UI**
  (`@base-ui/react`), the successor to Radix - different package and a few different prop/slot names.
- **Rule:** Import primitives from `@base-ui/react`. When adding shadcn components, use the
  `base-nova` registry; don't assume Radix APIs or `@radix-ui/*` imports.

### Azure `gpt-image` needs a preview API version
- **Problem:** Image generation failed on the GA chat API version while chat worked.
- **Root cause:** Azure OpenAI image deployments often require a **preview** `api-version` distinct
  from the GA version used for chat.
- **Rule:** Keep `AZURE_OPENAI_API_VERSION` flexible; if images 400, switch to a preview version
  (e.g. `2025-04-01-preview`). Documented in `.env.example` and the runbook.

### RLS anonymous-insert must be constrained by a deployed-page join
- **Problem:** Public landing pages need anonymous lead/page-view inserts, but a naive
  `to anon ... with check (true)` lets anyone forge rows for any user/page.
- **Root cause:** Anonymous writers have no `auth.uid()` to scope against.
- **Rule:** Gate anonymous `insert` with `exists (select 1 from landing_pages lp where lp.id =
  landing_page_id and lp.status = 'deployed' and lp.user_id = <table>.user_id)`. Keep
  read/update/delete owner-only. See [ADR 0003](./adr/0003-rls-strategy.md).

### `Reference-repo/` must be excluded from every toolchain
- **Problem:** The OpenBB Python reference repo could be linted/type-checked/built/deployed, breaking
  CI and bloating the bundle.
- **Root cause:** Default globs (`**/*`) sweep it into git, tsc, eslint, and Next file tracing.
- **Rule:** Exclude `Reference-repo/` in `.gitignore`, `tsconfig.json` (`exclude`),
  `eslint.config.mjs` (`globalIgnores`), and `.vercelignore`. Study it for ideas only; never ship it.

### Parallel agents must not run git concurrently (`index.lock`)
- **Problem:** Concurrent `git add`/`commit` from multiple subagents corrupts `.git/index.lock`.
- **Root cause:** Git takes a single index lock; simultaneous writers collide.
- **Rule:** Serialize git. Either commit sequentially after each unit completes, or designate one
  "committer" agent. Never run two git mutations at once.

### PowerShell is the shell - no `head`/`tail`/`grep`/`cat`
- **Problem:** `git log ... | head` failed: `head` is not a cmdlet.
- **Root cause:** The dev environment is Windows PowerShell, not bash.
- **Rule:** Use PowerShell-native equivalents (`Select-Object -First N`) or the editor's dedicated
  read/search tools. Don't pipe through Unix-only utilities.

### Zod v4 uses top-level string-format validators
- **Problem:** Mixing `z.string().email()` style with v4 APIs.
- **Root cause:** Zod v4 exposes `z.email()`, `z.uuid()`, `z.url()` as top-level validators.
- **Rule:** Use `z.email()` / `z.uuid()` / `z.url()` (matching the existing validators) for new
  schemas to stay consistent.

### Test/e2e/config files are type-checked by `next build`
- **Problem:** Worry that adding `*.test.ts`, `e2e/*.spec.ts`, and `*.config.ts` could break build.
- **Root cause:** `tsconfig.json` includes `**/*.ts`, and `next build` runs a full type check over
  included files (not just bundled ones).
- **Rule:** Keep every added TS file (tests, e2e specs, Vitest/Playwright configs) strictly typed and
  lint-clean - import test globals explicitly from `vitest` / `@playwright/test` rather than relying
  on ambient globals.

### Vitest + cached env loader: reset modules per case
- **Problem:** `getEnv()` caches its result, so `vi.stubEnv` after first call had no effect.
- **Root cause:** `src/lib/env.ts` memoizes the parsed env in a module-level variable.
- **Rule:** In env tests, `vi.stubEnv(...)` then `await import("./env")` and `vi.resetModules()` in
  `afterEach` so each case re-evaluates the module against fresh env.

---

## 2026-06-28 - Wave 2 (Research Engine + Operator agent) integration

### supabase-js resolves every table to `never` when DB rows are `interface`s
- **Problem:** With `SupabaseClient<Database>`, every `.from(table)` query typed Row/Insert/Update as
  `never`, so each module added a homomorphic mapped-type "remap" cast to recover working table types.
- **Root cause:** supabase-js's `GenericTable` requires `Row`/`Insert`/`Update` to extend
  `Record<string, unknown>`. TypeScript gives **object-literal `type` aliases and mapped types an
  implicit index signature but withholds it from `interface`s** (which stay open to declaration
  merging). Because the `Row` shapes were `interface`s, no table satisfied `GenericTable`, the `public`
  schema failed `GenericSchema`, and the client's `Schema` generic collapsed to `never`
  (`Schema = Database['public'] extends GenericSchema ? ... : never`).
- **Rule:** Author hand-written Supabase Row/Insert/Update shapes as **`type` aliases, never
  `interface`s**. Keep `src/types/database.ts` as the single source of truth so no module needs a cast.

### Fix the shared contract centrally when parallel workers converge on the same workaround
- **Problem:** Both Wave 2 workers (research `store.ts`, agent `persistence.ts`) independently added the
  *same* `Indexed<>/RemapTable<>` cast to dodge the `never` tables - duplicated, load-bearing type
  gymnastics in two files.
- **Root cause:** Each worker treated `database.ts` as frozen and patched locally instead of fixing the
  shared contract.
- **Rule:** When two independent modules invent the same workaround for a shared-contract defect, treat
  that as the signal to fix the contract at integration and delete the local casts - don't let the
  workaround calcify into N copies.

### `next build` is the real integration gate - not tsc/lint/test
- **Problem:** `tsc --noEmit`, `npm run lint`, and `npm test` were all green, yet none of them exercise
  the React Server/Client boundary or route/RSC bundling that only `next build` enforces.
- **Root cause:** Vitest runs in a node env, and tsc/eslint don't model the Server/Client boundary,
  `"use client"`/`"use server"` directives, or edge/node runtime selection - a client component can
  import server-only code (e.g. `next/headers`) and still pass all three checks.
- **Rule:** Always run `npm run build` as the final gate before declaring integration done. A green
  tsc/lint/test is necessary but not sufficient.

---

## 2026-06-28 - Wave 3 (Campaigns + Creative Studio) integration

### Parallel workers transiently see each other's `tsc`/`lint` errors
- **Problem:** While two workers built Campaigns and Creative Studio against the same uncommitted
  working tree, each worker's `tsc`/`lint` intermittently flagged errors that originated in the *other*
  worker's half-written files (missing exports, not-yet-created modules) - even though its own code was
  correct. This can spook a worker into "fixing" code that isn't broken.
- **Root cause:** A shared, uncommitted working tree means every type-check/lint sees the *union* of
  both workers' in-flight edits. Cross-module imports resolve against whatever the sibling has written
  so far, so transient errors appear and vanish as the sibling progresses.
- **Rule:** During parallel work, treat a worker's own mid-flight `tsc`/`lint` as **advisory only**.
  The authoritative signal is the **post-integration gate**, run once after both workers finish on the
  combined tree - and `next build` remains the real gate (tsc/lint/test can't catch Server/Client
  boundary or RSC bundling defects). Don't chase a sibling's transient errors mid-build.

### Clean Server/Client boundaries make integration a no-op
- **Problem:** The integration gate is where parallel work usually breaks (`next build` surfaces
  client components importing server-only code). Wave 3 passed `build` with **zero** fixes.
- **Root cause (why it worked):** Each module exposed a **client-safe barrel** (`@/lib/<module>`)
  re-exporting only pure modules, kept server-only modules (Azure/Supabase, `next/headers`) behind
  explicit-path imports used only by server actions / route handlers, and pinned the streaming route to
  `export const runtime = "nodejs"`. tsc/lint stayed green *and* so did build.
- **Rule:** Bake the boundary into the module's public surface from the start: a pure barrel for
  clients, explicit server-only paths for actions/routes, and an explicit `runtime` on any route doing
  Node-only work. Boundary discipline up front turns the integration gate into a formality.

---

## 2026-06-30 - Wave 4 (Landing Pages + Performance Intelligence) integration

### `URL.origin` is the string `"null"` for non-HTTP schemes
- **Problem:** Cleaning a visitor `referer` header with `new URL(ref).origin` produced the literal
  string `"null"` for app-deep-link referrers like `android-app://com.example`, polluting attribution.
- **Root cause:** Per the URL spec, `origin` is only defined for special (HTTP(S)/ws(s)/ftp/file)
  schemes; for every other scheme it serializes to the opaque string `"null"` rather than throwing.
- **Rule:** Don't normalize untrusted referrers via `.origin`. Build the base from
  `protocol + host + pathname` (host-guarded), drop query/hash, cap the length, and fall back to the
  trimmed raw value on parse failure. See `cleanReferrer` in `src/lib/landing/utm.ts` (+`utm.test.ts`).

### Per-module independent demo seeding drifts campaign ids apart
- **Problem:** Each module seeds its own demo data under a *different* campaign id - the campaign store,
  Creative Studio, the analytics "adoption" bridge, and landing (which reuses creative's demo campaign)
  don't share one id. A judge clicking through research -> creatives -> landing -> analytics sees
  several disconnected "demo" campaigns instead of one coherent journey.
- **Root cause:** Modules were built in parallel with no shared seed contract; each invented its own
  canonical id. Analytics papers over this at runtime by *adopting* creatives into the headline
  campaign as a bridge, but the underlying ids still diverge.
- **Rule:** A demo needs **one** canonical seeded campaign id that every module references. Defer the
  real fix to the Wave 6 demo-seed (establish the shared id at seed time); until then, document the
  adoption bridge as a known stopgap so it isn't mistaken for the intended design. See the
  CARRY-FORWARD note in [progress](./progress.md).

---

## 2026-06-30 - Wave 6 (Azure AI Foundry v1 client adaptation + live validation)

### Azure AI Foundry v1 surface is NOT classic Azure OpenAI - use the OpenAI provider
- **Problem:** The provisioned models live on `*.services.ai.azure.com/openai/v1`, but the client was
  built on `@ai-sdk/azure`'s `createAzure({ useDeploymentBasedUrls: true })` + the `api-key` header,
  which targets the classic `*.openai.azure.com/openai/deployments/{deployment}/...?api-version=` scheme.
  Pointed at the v1 base it would build the wrong URLs and use the wrong auth header.
- **Root cause:** Foundry's v1 surface is **OpenAI-wire-compatible**: standard
  `Authorization: Bearer <key>`, no `api-version` query param, and the OpenAI-style `model` argument is
  the **deployment name**. The Azure provider's whole point (deployment URL rewriting + `api-key`) is
  exactly what this surface does *not* want.
- **Rule:** For `services.ai.azure.com/openai/v1`, use `@ai-sdk/openai`'s
  `createOpenAI({ baseURL: <.../openai/v1>, apiKey })` and `provider.chat(deploymentName)` for
  chat-completions (keeps `streamText`/`generateText` + tool-calling). Pin the provider to the version
  that shares `@ai-sdk/provider`/`@ai-sdk/provider-utils` with the installed `ai` (`@ai-sdk/openai@4.0.2`
  ↔ `ai@7.0.4`, both on `@ai-sdk/provider@4.0.0` + `@ai-sdk/provider-utils@5.0.1`) - mismatched provider
  majors break the `LanguageModelV*` types. Keep the exported client signatures stable so no consumer
  changes.

### MAI-Image-2.5 lives on `/mai/v1`, and `output_format` is a MIME type
- **Problem:** Image generation failed twice before working: `output_format: "png"` → HTTP 400
  (`invalid value: png`), and once that was fixed, `/openai/v1/images/generations` → HTTP 404 (an Azure
  ML HTML "Not Found" page) *after* passing input validation.
- **Root cause:** The MAI image model's input validator runs at the `/openai/v1` gateway (hence the 400
  is JSON), but the actual generation backend is served at **`/mai/v1/images/generations`** - the
  `/openai/v1` path 404s on the generate step. And `output_format` only accepts MIME types
  (`image/png|image/jpeg|image/webp` or `null`), not the bare `png` that classic gpt-image used. The
  provisioning doc's curl example (`/openai/v1/...`, `output_format: png`) was wrong; **the live API is
  the source of truth.**
- **Rule:** POST image gen to `.../mai/v1/images/generations` with `output_format: "image/png"`. When
  deriving the endpoint from the base URL, rewrite `/openai/v1` → `/mai/v1`. Always live-probe a new
  image surface (a 400 means "reached + validated"; a 404 after that means "wrong generate path") rather
  than trusting written examples.

### The AI SDK treats `gpt-5.3-chat` as a reasoning model and drops `temperature`
- **Problem:** Chat calls succeed but emit `AI SDK Warning ... "temperature" is not supported ...
  temperature is not supported for reasoning models`, so the copy generator's `0.8` and the planner's
  `0.2` temperatures are silently ignored.
- **Root cause:** `@ai-sdk/openai`'s chat model classifies `gpt-5*` ids as reasoning models and strips
  unsupported sampling params (it sends `max_completion_tokens`, omits `temperature`). The `-chat`
  suffix does not exempt our custom deployment name from that heuristic.
- **Rule:** Treat this as expected/graceful - the call still returns text, so no code change is needed;
  just don't rely on `temperature` steering output diversity for this model. If determinism/diversity
  ever matters, switch to a non-reasoning chat deployment or vary the prompt, not the temperature.

---

## 2026-06-30 - Wave 6 (Bright Data live data + Scraping Browser)

### Bright Data SERP `brd_json=1` returns JSON on the SERP zone - the existing parser already matched
- **Problem:** Before going live we assumed `brd_json=1` might return raw HTML (the zone default), which
  would have meant rewriting `parseSerpJson` to scrape HTML.
- **Root cause / finding:** On zone `serp_api1`, `POST /request { zone, url: <google ...&brd_json=1>,
  format: "raw" }` returns **`content-type: application/json`** with top-level keys
  `general, input, navigation, organic, top_ads, pagination, related`; `organic[]` items are
  `{ title, link, description, rank }` and `related[]` is strings/`{query}` - **exactly** what the
  parser reads. A live `"retirement income newsletter"` query returned 9 organic + 8 related results.
- **Rule:** For the SERP zone, append `brd_json=1` and parse JSON (`organic`/`related`/
  `people_also_ask`); `format` stays `"raw"` (it controls the transport envelope, not the SERP parsing).
  Validate live with `npm run smoke:brightdata` before assuming a shape - the live response is the
  source of truth, and here it already matched (no parser change).

### Bright Data Scraping Browser is a remote WS client - serverless-safe, but use `puppeteer-core` + dynamic import
- **Problem:** "Add a browser" usually means bundling Chromium - impossible on Vercel serverless, and a
  static `import "puppeteer"` would download Chromium and bloat/break the build + client bundle.
- **Root cause:** Bright Data's Scraping Browser runs Chromium **remotely**; you only need a CDP/WS
  client. `puppeteer-core` (no bundled browser) connecting via `puppeteer.connect({ browserWSEndpoint })`
  is all that's required, and it works unchanged on Node serverless.
- **Rule:** Use **`puppeteer-core`** (pinned exact), connect to `BRIGHTDATA_BROWSER_WS`, and **`await
  import("puppeteer-core")` dynamically** inside the helper (with a `type`-only import for `Browser`/
  `Page`) so it stays server-only, lazy, and out of the client bundle - `next build` then passes with no
  config change. Always `disconnect()` in `finally` (and guard the race where `connect` resolves after
  your timeout) so you never leak a remote session; on any failure return `null` so callers fall back.

### Don't `import "server-only"` in a module the offline Vitest suite must load
- **Problem:** Marking `scraping-browser.ts` with `import "server-only"` would have thrown the moment
  `competitor-ads` (and its tests) imported it under Vitest's Node resolver, breaking the suite.
- **Root cause:** The `server-only` package resolves to a throwing module unless the bundler sets the
  `react-server` condition (Next does; Vitest does not), and it isn't even installed here. The Vitest
  config is a frozen contract for this task (couldn't add an alias).
- **Rule:** When a server-only module must also be unit-tested offline, enforce "server-only" by
  *construction* (dynamic `import()` of the native dep + read `process.env` at call time + a doc note),
  not via the `server-only` guard. Reserve `import "server-only"` for modules never loaded by tests.

### Meta Ad Library live extraction is access-limited - design for the fallback, not the happy path
- **Problem:** Connecting + navigating the Scraping Browser works live (`example.com` title verified),
  but navigating the **Meta Ad Library** returned `Protocol error (Page.navigate): Page.navigate domain
  limit reached`, yielding zero cards.
- **Root cause:** Meta Ad Library is JS-heavy and access-restricted, and the trial Scraping Browser zone
  caps navigations/domains per session - so live extraction is unreliable by nature, not a bug in our
  code.
- **Rule:** Treat JS-heavy/anti-bot pages as **best-effort**: bound the effort, extract whatever signal
  you can (advertiser + ad copy), and ALWAYS fall back cleanly (Scraping Browser → Web Unlocker markdown
  → seeded fixture). A robust fallback chain that never throws is the success criterion - don't sink
  time chasing brittle selectors.

---

## Wave 6 - Canonical Demo Seed + Integration Polish

### Per-module demo ids fragment the judge experience — unify via a single constants file
- **Problem:** Each module seeded its own demo data under different campaign ids (campaign store: a
  string id, Creative Studio: a UUID, analytics: adopted creatives via a bridge, landing: reused
  creative's id, research: its own project id with `null` campaign link). A fresh judge navigating
  across modules saw disjointed "demo" campaigns.
- **Fix:** Created `src/lib/seed/constants.ts` as the ONE canonical source of truth for all demo ids
  (`DEMO_CAMPAIGN_ID`, `DEMO_USER_ID`, `DEMO_RESEARCH_PROJECT_ID`, `DEMO_CREATIVE_IDS`,
  `DEMO_LANDING_IDS`, `DEMO_LANDING_SLUG`, `DEMO_PAIN_POINTS`, `DEMO_VOCAB`). Every module store now
  imports from this file. The research project is linked to the campaign via `campaignId`. The analytics
  "adoption bridge" is now just a fallback path rather than the primary mechanism.
- **Rule:** When multiple modules need to reference the same entity, define the id in ONE shared
  constants file and import everywhere. Never inline ids in multiple modules — they WILL drift.

### Error boundaries prevent white-screen during demo
- **Rule:** Always wrap client-renderable shells in an error boundary. A white screen during a demo is
  worse than an error message with a "Try again" button.

### Command palette registration at module level
- **Pattern:** Module actions register via a side-effect import (`import "@/lib/command-actions-init"`)
  in the palette component. This ensures all actions are available by the time the palette renders,
  regardless of which page the user navigates to first.

---

## 2026-07-01 - Subagent orchestration reliability

### 2026-07-01 - Subagent workers failing to start

**Problem:** Two Wave 4 workers (Landing + Analytics) produced zero files despite being launched. Assumed "prompt too large" might be the cause.

**Root cause:** Prompt size is NOT the cause of subagent failures. The workers simply did not execute (possibly session/connection drops, resource limits, or transient platform issues). The same full-length prompts succeeded on retry.

**Rule:** When a worker produces zero output, retry with the exact same full prompt. Do not truncate prompts as a mitigation - it wastes detail that the worker needs. If it fails again, investigate platform/session issues instead.

### 2026-07-01 - Do not call subagents within subagents

**Problem:** Subagent workers attempted to spawn their own child subagents (e.g., for parallel internal work or to delegate sub-tasks). This causes `[invalid_argument]` errors and silent failures.

**Root cause:** The platform does not support nested subagent invocations. A subagent is a leaf executor - it can use tools (shell, file read/write, grep, etc.) but cannot spawn further subagents. Only the parent orchestrator can launch subagents.

**Rule:** Never instruct a subagent to "launch a worker" or "delegate to a subagent" in its prompt. All parallelization decisions happen at the parent level. Subagents execute sequentially with their available tools. If a task needs decomposition, the parent splits it into multiple sibling subagents, not nested ones.

---

## 2026-07-01 - Delight Sprint

### motion.button replaces Base UI Button - extract buttonVariants for server components
- **Problem:** Converting button.tsx to `"use client"` (required for motion.button) broke server
  components that imported `buttonVariants()` for className generation.
- **Root cause:** Server Components cannot import from `"use client"` modules. `buttonVariants` is a
  pure function (no hooks/state) but was co-located with the client Button.
- **Fix:** Extract `buttonVariants` into a separate `button-variants.ts` (no directive) that both
  server and client code can import.
- **Rule:** When upgrading a UI primitive to a client component, extract any pure utilities used by
  server code into a directive-free sibling module.

### Spring physics: stiffness 500 / damping 30 is the sweet spot for buttons
- **Finding:** Linear and Raycast both use similar configs. Stiffness 500 + damping 30 gives a fast
  settle with barely-perceptible overshoot. Lower damping (25) on the sidebar indicator gives more
  visible spring for route changes (a different interaction frequency).
- **Rule:** High-frequency interactions (buttons, toggles) use higher damping (30). Lower-frequency
  indicators (route change, panel open) use lower damping (25) for more expression.

### Web Audio API: always ramp gain to avoid clicks
- **Finding:** Starting/stopping an OscillatorNode produces an audible click at the discontinuity.
- **Fix:** Use a GainNode with a 2-5ms linear ramp at both attack and release.
- **Rule:** Never start an oscillator at full gain. Always ramp: `gain.linearRampToValueAtTime(target, now + 0.005)`.

