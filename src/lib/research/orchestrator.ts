import { getResearchAnalyzer } from "./analyzer";
import { ensureProvidersRegistered } from "./providers";
import type { ResearchProvider } from "./provider";
import { researchRegistry } from "./registry";
import {
  researchReportSchema,
  type ProviderResult,
  type QueryParams,
  type ResearchReport,
  type ResearchResult,
} from "./standard-models";

/**
 * Runs research providers in parallel and merges their normalized output into a
 * single citation-rich `ResearchResult`. Providers stream results back via
 * `onProviderResult` so the UI can render progressively as sources return.
 */

export interface OrchestratorOptions {
  /** Provider names to run. Defaults to all available providers. */
  providers?: string[];
  signal?: AbortSignal;
  limitPerProvider?: number;
  /** Progressive callback fired as each provider completes. */
  onProviderResult?: (result: ProviderResult) => void;
}

export async function runResearch(params: QueryParams, options: OrchestratorOptions = {}): Promise<ResearchResult> {
  const selected: ResearchProvider[] = options.providers
    ? options.providers
        .map((name) => researchRegistry.get(name))
        .filter((provider): provider is ResearchProvider => provider !== undefined && provider.isAvailable())
    : researchRegistry.available();

  const results = await Promise.all(
    selected.map(async (provider) => {
      const result = await provider.run(params, {
        signal: options.signal,
        limit: options.limitPerProvider,
      });
      options.onProviderResult?.(result);
      return result;
    }),
  );

  return mergeProviderResults(params, results);
}

/**
 * The full research pipeline: register built-in providers, run them in parallel
 * (streaming each result), then layer on the AI analyzer (personas, ranked pain
 * points, buying triggers, opportunities). Returns the citation-rich
 * `ResearchReport` the workspace renders and the store persists.
 *
 * Never throws for missing credentials: providers degrade to seeded fixtures and
 * the analyzer degrades to seeded/derived output, so this always resolves to a
 * compelling report.
 */
export async function runResearchPipeline(params: QueryParams, options: OrchestratorOptions = {}): Promise<ResearchReport> {
  ensureProvidersRegistered();

  const result = await runResearch(params, options);
  const analyzer = getResearchAnalyzer();
  const analyzeInput = { params, result, signal: options.signal };

  const [segments, painPoints, buyingTriggers, opportunities] = await Promise.all([
    analyzer.synthesizePersonas(analyzeInput),
    analyzer.extractPainPoints(analyzeInput),
    analyzer.detectBuyingTriggers(analyzeInput),
    analyzer.detectOpportunities(analyzeInput),
  ]);

  return researchReportSchema.parse({
    ...result,
    segments,
    painPoints,
    buyingTriggers,
    opportunities,
    generatedAt: new Date().toISOString(),
  });
}

/** Pure merge of provider results into the aggregated standard-model buckets. */
export function mergeProviderResults(params: QueryParams, results: ProviderResult[]): ResearchResult {
  const merged: ResearchResult = {
    query: params,
    segments: [],
    competitorAds: [],
    trends: [],
    communityInsights: [],
    painPoints: [],
    buyingTriggers: [],
    sources: [],
    providerRuns: [],
    generatedAt: new Date().toISOString(),
  };

  for (const result of results) {
    merged.providerRuns.push({
      provider: result.provider,
      status: result.status,
      itemCount: result.items.length,
      error: result.error,
      durationMs: result.durationMs,
    });
    merged.sources.push(...result.sources);

    for (const item of result.items) {
      switch (item.kind) {
        case "audience_segment":
          merged.segments.push(item.data);
          break;
        case "competitor_ad":
          merged.competitorAds.push(item.data);
          break;
        case "trend_signal":
          merged.trends.push(item.data);
          break;
        case "community_insight":
          merged.communityInsights.push(item.data);
          break;
        case "pain_point":
          merged.painPoints.push(item.data);
          break;
        case "buying_trigger":
          merged.buyingTriggers.push(item.data);
          break;
      }
    }
  }

  return merged;
}
