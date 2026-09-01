# ADR 0002: Research Provider Abstraction (OpenBB-inspired TET)

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** Foundation build

## Context

The Audience Research Intelligence Engine is the platform's moat. It must aggregate many different
data sources (competitor ads, search intent, Reddit/community, news, social, web) and present a
single, citation-rich, normalized result that every downstream module (personas, creatives, landing
pages) can consume. New sources will be added throughout the build and beyond. We cannot let each
new source ripple changes through the orchestrator, the UI, or the consumers.

OpenBB solves the analogous problem in finance with a **"connect once, consume everywhere"** Fetcher
pattern: each provider implements a uniform **Transform -> Extract -> Transform (TET)** pipeline and
normalizes to shared **standard models**.

## Decision

Adopt the OpenBB TET Fetcher pattern, expressed in TypeScript.

1. **Standard models are the contract** (`src/lib/research/standard-models.ts`). Zod schemas are the
   source of truth; types are inferred from them. Core models: `AudienceSegment`, `CompetitorAd`,
   `TrendSignal`, `CommunityInsight`, `PainPoint`, `BuyingTrigger`. Every item carries
   `sources: SourceCitation[]` so claims are attributable. Providers emit a tagged
   `StandardModel` discriminated union (`{ kind, data }`).

2. **Every source extends one abstract class** (`src/lib/research/provider.ts`):

   ```ts
   abstract class ResearchProvider<Q, D extends StandardModel> {
     abstract readonly name: string;          // registry id
     abstract readonly produces: ReadonlyArray<StandardModelKind>;
     readonly tier: "free" | "pro" = "free";  // Bright Data capability tier
     abstract transformQuery(params: QueryParams): Q | Promise<Q>;        // T
     abstract extractData(query: Q, ctx): Promise<RawData>;               // E (Bright Data)
     abstract transformData(raw: RawData, params): NormalizedOutput<D>;   // T
     isAvailable(): boolean { return true; } // override for Pro-gated providers
     run(params, ctx): Promise<ProviderResult> // runs TET, never throws
   }
   ```

   `run()` wraps the pipeline so a failed provider degrades to an empty, error-tagged
   `ProviderResult` instead of breaking an orchestrated run.

3. **A registry discovers providers** (`src/lib/research/registry.ts`). Feature teams
   `researchRegistry.register(provider)` once; the orchestrator finds them via `list()` /
   `available()`. Duplicate names throw.

4. **The orchestrator runs providers in parallel and merges** (`src/lib/research/orchestrator.ts`):
   `runResearch()` selects available providers, runs them with `Promise.all`, streams each result
   via `onProviderResult`, then `mergeProviderResults()` buckets the tagged items into the
   aggregated `ResearchResult`.

5. **Bright Data access is an injectable adapter** (`src/lib/research/brightdata.ts`) behind a
   `BrightDataClient` interface, with `getBrightDataClient()` / `setBrightDataClient()` so tests and
   seeders inject fixtures - no live network in CI.

## How to add a provider (summary)

1. Implement `transformQuery` / `extractData` / `transformData` over `BrightDataClient`.
2. Declare `name`, `produces`, and (if Pro) `tier = "pro"` + an `isAvailable()` override.
3. `researchRegistry.register(new MyProvider())`.

The orchestrator, merge, UI, and consumers need **zero** changes. Full walkthrough with code:
[research-engine.md](../research-engine.md).

## Consequences

- **Positive:** Adding a data source is a localized, testable change. Citations are guaranteed by the
  contract. Parallel execution is automatic. Graceful degradation is built into `run()` and
  `isAvailable()`. This is the "another engineer could extend it" code-quality story for judges.
- **Negative:** Indirection has a learning curve; providers must normalize carefully to the standard
  models. Mitigation: the abstract `run()` handles errors/timing uniformly, and each provider ships
  with fixture-based unit tests (TET `transform_query` / `transform_data`).
