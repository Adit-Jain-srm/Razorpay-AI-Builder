# Performance Intelligence (Module 5)

Cross-platform performance analytics with AI insights: a realistic 90-day
multi-platform seeder, Z-score anomaly detection, a heuristic recommendation
engine, and an AI daily brief - all feeding the Operator's monitoring loop.
Cross-references: [architecture](./architecture.md), [campaigns](./campaigns.md),
[creative-studio](./creative-studio.md), [api](./api.md), [progress](./progress.md),
[runbook](./runbook.md).

It runs **fully credential-free** (deterministic seeded demo) and upgrades to
live Azure briefs + Supabase persistence when configured.

---

## Architecture

```
src/lib/analytics/
  types.ts          Domain types (MetricKey, MetricSummary, AnomalyFinding, Recommendation, ...)
  math.ts           PURE stats: mean/stddev/zScores/percentChange/linearTrend/movingAverage
  format.ts         PURE display formatters (compact $/%/x, dates, platform labels)
  aggregate.ts      PURE roll-ups: summarize, by-platform/creative, daily series, funnel, deltas
  anomalies.ts      PURE Z-score detection over time series -> AnomalyFinding[] -> anomaly inserts
  recommendations.ts PURE heuristics: scale / pause / refresh / reallocate / investigate
  brief.ts          SERVER: generateDailyBrief (Azure GPT-4o) + PURE templatedBrief fallback
  index.ts          Client-safe barrel (pure modules only; brief.ts is server-only)

src/lib/seed/
  rng.ts                 PURE seedable RNG (xmur3 + mulberry32, gaussian jitter)
  analytics-generator.ts PURE generator: platform baselines, fatigue, seasonality, injected anomalies
  targets.ts             PURE: demo seed targets from creative fixtures + label helpers
  analytics.ts           SERVER: collectSeedTargets (real ids) + idempotent seedAnalytics
  index.ts               Barrel

src/lib/services/analytics.service.ts   Persistence: Supabase (RLS) + seeded in-memory store
src/app/(dashboard)/analytics/page.tsx           Overview (portfolio + per-campaign table)
src/app/(dashboard)/analytics/[campaignId]/page.tsx  Deep dive (server fetch -> client charts)
src/app/(dashboard)/analytics/actions.ts         Server actions (brief refresh, detection, seed)
src/components/analytics/**                       Dashboard UI (Recharts panels are client)
```

**Data flow (deep dive):** `[campaignId]/page` (server) fetches metrics +
anomalies + insights via `analyticsService`, resolves creative labels via
`creativeService.get`, computes anomalies + recommendations + the templated brief,
then passes plain serializable data to the **client** `CampaignAnalytics`
orchestrator, which derives every filtered view with the pure functions and
renders the Recharts panels.

The Server/Client boundary is strict: data fetching, the Azure brief, and Supabase
all stay server-side; the client bundle only ever imports `@/lib/analytics`
(pure) and the chart components.

---

## Seeder model (realistic + deterministic)

`generateMetrics(target, options)` is a **pure, deterministic** function: the same
`(target, seed, endDate, days)` always produces identical rows (seedable RNG, no
`Math.random()`), so the demo is reproducible and the distributions are testable.

Per `(creative, day)` it models:

- **Platform baselines** - impressions / CTR / CVR / CPC / revenue-per-conversion
  per platform, tuned so CPAs land ~$7-$23 and ROAS ~3.7x-11x (Taboola cheapest,
  TikTok priciest, Google highest intent).
- **Creative quality** - per-creative CVR/CTR multipliers (id-derived by default,
  explicit for the demo) so some creatives clearly out/under-perform.
- **Creative fatigue** - CTR decays with creative age on an exponential curve to a
  floor (`floor + (1-floor)·e^(-age/τ)`, τ≈38d), so older creatives lose engagement.
- **Launch ramp + staggered launches** - creatives ease in over their first week
  and can launch late (fresh creatives have fewer rows, no fatigue yet).
- **Weekly seasonality** - weekday multipliers (weekends softer for a finance
  audience) plus a slow upward growth trend.
- **Seeded Gaussian noise** - reproducible per-row jitter on every quantity.
- **Injected anomalies** - a Taboola **CPA spike**, a Meta **CTR drop** (multi-day),
  and a Google **spend surge**, applied at the platform level so the aggregated
  series clearly shows them. The generator returns the injected metadata so tests
  can assert the detector catches them.

Identities are honest: `clicks ≤ impressions`, `conversions ≤ clicks`, and
ratios (`cpa`/`ctr`/`cvr`/`roas`) are derived per row (null when undefined).

### Idempotent seed entry

`seedAnalytics(options)` (server) reads **real campaign + creative ids** via
`campaignService` / `creativeService`, generates metrics per campaign, persists
them through `analyticsService.insertMetrics`, then detects + stores anomalies and
an initial templated brief. It is **idempotent**: a campaign that already has
metrics is skipped unless `force` is set. Reusable by the later demo-seed phase.

### Demo id bridge (credential-free)

The campaign store seeds the headline demo campaign under
`demo-campaign-retirement-income`, while the Creative Studio seeds its demo
creatives under a separate UUID campaign id (a pre-existing split owned by other
modules we cannot edit). For a rich credential-free demo, the in-memory analytics
store **adopts** those real seeded creatives into the headline demo campaign:
metrics reference the real creative ids, so `creativeService.get(id)` still
resolves their labels in the dashboard. Against Supabase with properly linked
data, `collectSeedTargets` uses each campaign's own creatives and no adoption
happens.

---

## Anomaly detection (Z-score, pure)

`detectSeriesAnomalies(points, opts)` computes population z-scores over a daily
series and flags points beyond a threshold (default 2.5) in the **harmful**
direction, collapsing consecutive exceedances into a single peak finding:

| Metric | Direction flagged | Meaning |
|---|---|---|
| CPA   | high  | conversions getting more expensive |
| CTR   | low   | creative fatigue / audience saturation |
| Spend | both  | budget pacing anomaly |

`detectCampaignAnomalies(rows)` runs this per-platform and cross-platform, builds
clean series (dropping undefined days - e.g. a CPA day with zero conversions),
classifies severity (`low`/`medium`/`high`/`critical` by |z|), and returns
findings sorted by severity then recency. `toAnomalyInserts` maps them onto
`anomalies` rows (platform encoded in the `metric` key, e.g. `cpa:taboola`).

---

## Recommendation engine (heuristics, pure)

`buildRecommendations({ rows, campaignId, meta, anomalies })` produces ranked,
**id-anchored** actions (every rec carries the real campaign/creative/platform):

- **Scale** - creatives with CPA well below the campaign average (≥ ~22% lower) on
  enough volume.
- **Pause** - creatives whose CPA has run over target for N straight days (target =
  campaign avg × 1.4, or an explicit `targetCpa`).
- **Refresh** - creatives whose CTR has decayed (first vs last third of their life).
- **Reallocate** - shift budget toward the platform with the best ROAS.
- **Investigate** - high/critical anomalies surfaced as actions.

All thresholds are options with sensible defaults, so the engine is deterministic
and unit-tested.

---

## AI daily brief

`generateDailyBrief(input)` writes a natural-language summary of trends,
anomalies, and the top recommendation. It uses **Azure GPT-4o** when configured
and degrades to a **deterministic templated brief** (`templatedBrief`, pure)
computed from the same stats - so the panel always renders well with zero
credentials. The "Refresh brief" action persists the result as an `ai_insights`
row; the deep-dive page prefers a persisted brief and otherwise renders the
templated one (no network at render time when Azure is unset).

---

## Service + fallback

`analytics.service.ts` mirrors the campaign/creative store strategy:

- **Supabase store** (RLS-scoped) when configured and signed in - typed queries
  with date/platform/creative filters, chunked bulk inserts (user scoping forced
  server-side), and anomaly/insight persistence.
- **Seeded in-memory store** otherwise - 90 days of deterministic demo metrics +
  detected anomalies on first access, so the dashboard is fully demoable offline.

Public surface: `metrics`, `summary`, `insertMetrics`, `anomalies`, `insights`,
plus `insertAnomalies`, `insertInsight`, `resolveAnomaly`, `markInsightActioned`.

---

## Dashboard UI

- **Overview** (`/analytics`) - portfolio blended metrics + a per-campaign table
  linking to each deep dive.
- **Deep dive** (`/analytics/[campaignId]`) - metric cards with period deltas
  (mono, semantic colors), the AI brief panel, a metric-switchable time-series
  chart with an OLS **trendline**, a **normalized** cross-platform comparison,
  the Impression -> Click -> LP View -> Lead -> Conversion **funnel**, a
  creative-performance **correlation** bubble chart + table, an anomalies feed,
  and the recommendations panel. Platform filter + metric selector recompute
  client-side; **CSV export** downloads the current view.

Design system: zinc + emerald, Phosphor icons, Geist, `font-mono` for all
numerics, the foundation empty/loading/error kit, and reduced-motion-safe chart
animations. LP Views and Leads are **modeled** funnel stages (the metrics table
has no such columns) from fixed, documented ratios and clamped monotonic.

---

## Tests (Vitest, CI-safe)

All pure - no network, deterministic seeds, Supabase mocked:

- `math.test.ts` - stats primitives (z-scores, trend, percent change).
- `aggregate.test.ts` - summary math (ratios from totals), platform/creative
  breakdowns, funnel monotonicity, period deltas.
- `anomalies.test.ts` - injected spike/drop detection, direction, run collapsing,
  and detection on seeded data.
- `recommendations.test.ts` - scale / pause / refresh / reallocate / investigate.
- `analytics-generator.test.ts` - determinism, coverage, plausibility, fatigue,
  injected-anomaly detectability.
- `analytics.service.test.ts` - seeded in-memory store + mocked Supabase store
  (user scoping, filters, inserts).

Run: `npx vitest run src/lib/analytics src/lib/seed src/lib/services/analytics.service.test.ts`.

---

## Follow-ups

- **PDF report export** - intentionally not built (would require a new dependency).
  CSV export ships today; PDF is a clean follow-up (e.g. a print stylesheet or a
  server-side renderer).
- **Operator wiring** - the recommendation/anomaly/brief functions are pure and
  exported so the Operator's monitoring/improvement loop (Wave 5) can consume them
  directly.
- **Live ad-platform ingestion** - replace the seeder with real Google/Meta/TikTok
  /Taboola metrics; the schema, detection, and recommender are already platform-agnostic.
