/**
 * Assembles a complete, seeded `ResearchReport` from the curated vertical
 * fixtures. Used as the ultimate fallback (no Bright Data + no Azure) and to
 * seed a demo project so the workspace is never empty.
 */

import {
  researchReportSchema,
  type ProviderRunSummary,
  type QueryParams,
  type ResearchReport,
  type SourceCitation,
} from "../standard-models";
import {
  buyingTriggersFixture,
  communityInsightsFixture,
  competitorAdsFixture,
  FIXTURE_FETCHED_AT,
  opportunitiesFixture,
  painPointsFixture,
  personasFixture,
  trendSignalsFixture,
} from "./financial-newsletter";

export const DEFAULT_SEED_QUERY: QueryParams = {
  query: "retirement income newsletter for near-retirees worried about inflation",
  industry: "financial newsletters",
  product: "retirement income newsletter",
  audienceHint: "near-retirees worried about inflation",
  region: "us",
};

const SEEDED_PROVIDER_RUNS: ProviderRunSummary[] = [
  { provider: "competitor_ads", status: "success", itemCount: competitorAdsFixture.length, durationMs: 1840 },
  { provider: "search_intent", status: "success", itemCount: trendSignalsFixture.length, durationMs: 1210 },
  { provider: "reddit_community", status: "success", itemCount: communityInsightsFixture.length, durationMs: 2360 },
  { provider: "news_industry", status: "success", itemCount: 4, durationMs: 1490 },
  { provider: "social_listening", status: "success", itemCount: 3, durationMs: 1670 },
  { provider: "web_intel", status: "success", itemCount: 2, durationMs: 2010 },
];

function gatherSources(): SourceCitation[] {
  const all: SourceCitation[] = [
    ...competitorAdsFixture.flatMap((a) => a.sources),
    ...trendSignalsFixture.flatMap((t) => t.sources),
    ...communityInsightsFixture.flatMap((c) => c.sources),
    ...painPointsFixture.flatMap((p) => p.sources),
    ...buyingTriggersFixture.flatMap((b) => b.sources),
    ...personasFixture.flatMap((p) => p.sources),
  ];
  const seen = new Set<string>();
  const out: SourceCitation[] = [];
  for (const s of all) {
    const key = s.url ?? s.title ?? `${s.provider}:${s.snippet ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Builds the full seeded report for the financial-newsletter vertical. */
export function buildSeededReport(params: QueryParams = DEFAULT_SEED_QUERY): ResearchReport {
  return researchReportSchema.parse({
    query: params,
    segments: personasFixture,
    competitorAds: competitorAdsFixture,
    trends: trendSignalsFixture,
    communityInsights: communityInsightsFixture,
    painPoints: painPointsFixture,
    buyingTriggers: buyingTriggersFixture,
    opportunities: opportunitiesFixture,
    sources: gatherSources(),
    providerRuns: SEEDED_PROVIDER_RUNS,
    generatedAt: FIXTURE_FETCHED_AT,
  });
}
