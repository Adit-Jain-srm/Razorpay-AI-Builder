import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ResilientBrightDataClient, resetBrightDataClient, setBrightDataClient } from "./brightdata";
import { resetResearchAnalyzer, setResearchAnalyzer, type ResearchAnalyzer } from "./analyzer";
import { mergeProviderResults, runResearchPipeline } from "./orchestrator";
import type { ProviderResult, QueryParams } from "./standard-models";

const params: QueryParams = {
  query: "retirement income newsletter for near-retirees worried about inflation",
  industry: "financial newsletters",
  region: "us",
};

describe("mergeProviderResults", () => {
  it("buckets tagged items, concatenates sources, and records provider runs", () => {
    const results: ProviderResult[] = [
      {
        provider: "competitor_ads",
        status: "success",
        durationMs: 10,
        sources: [{ provider: "competitor_ads", url: "https://example.com/a" }],
        items: [{ kind: "competitor_ad", data: { platform: "meta", copy: "x", hooksUsed: [], sources: [] } }],
      },
      {
        provider: "search_intent",
        status: "success",
        durationMs: 20,
        sources: [{ provider: "search_intent", url: "https://example.com/b" }],
        items: [
          { kind: "trend_signal", data: { topic: "inflation", timeSeries: [], sources: [] } },
          { kind: "buying_trigger", data: { trigger: "CPI report", sources: [] } },
        ],
      },
    ];

    const merged = mergeProviderResults(params, results);
    expect(merged.competitorAds).toHaveLength(1);
    expect(merged.trends).toHaveLength(1);
    expect(merged.buyingTriggers).toHaveLength(1);
    expect(merged.sources).toHaveLength(2);
    expect(merged.providerRuns).toHaveLength(2);
    expect(merged.providerRuns[1].itemCount).toBe(2);
  });
});

/** Deterministic analyzer so the pipeline test never touches Azure. */
const fakeAnalyzer: ResearchAnalyzer = {
  async synthesizePersonas(input) {
    return [
      {
        name: "Test Persona",
        demographics: {},
        psychographics: { values: [], interests: [], painPoints: input.result.painPoints.map((p) => p.summary), aspirations: [] },
        behaviors: { platforms: [], contentConsumption: [], purchasePatterns: [] },
        sizeEstimate: {},
        sources: input.result.sources.slice(0, 2),
      },
    ];
  },
  async extractPainPoints(input) {
    return input.result.painPoints;
  },
  async detectBuyingTriggers(input) {
    return input.result.buyingTriggers;
  },
  async detectOpportunities() {
    return [{ title: "Own the trust angle", rationale: "competitors skew to greed", type: "messaging_gap", sources: [] }];
  },
};

describe("runResearchPipeline (integration, no network)", () => {
  beforeEach(() => {
    setBrightDataClient(new ResilientBrightDataClient(null));
    setResearchAnalyzer(fakeAnalyzer);
  });
  afterEach(() => {
    resetBrightDataClient();
    resetResearchAnalyzer();
  });

  it("runs all providers + analyzer into a citation-rich report", async () => {
    const streamed: string[] = [];
    const report = await runResearchPipeline(params, { onProviderResult: (r) => streamed.push(r.provider) });

    // Provider-derived buckets are populated from fixtures.
    expect(report.competitorAds.length).toBeGreaterThan(0);
    expect(report.trends.length).toBeGreaterThan(0);
    expect(report.communityInsights.length).toBeGreaterThan(0);
    expect(report.sources.length).toBeGreaterThan(0);

    // Analyzer output is wired in.
    expect(report.segments).toHaveLength(1);
    expect(report.segments[0].name).toBe("Test Persona");
    expect(report.opportunities.length).toBeGreaterThan(0);

    // All six providers streamed + summarized.
    expect(report.providerRuns).toHaveLength(6);
    expect(new Set(streamed).size).toBe(6);
    expect(report.generatedAt).toBeTruthy();
  });
});
