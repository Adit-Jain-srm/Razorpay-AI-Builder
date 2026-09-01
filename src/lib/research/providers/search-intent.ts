import { getBrightDataClient, type BrightDataSearchResponse } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import type { QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import { dedupeBy, estimateVelocityFromRank, estimateVolumeFromRank, toCitation } from "./utils";

/**
 * Search Intent provider.
 *
 * Bright Data tools: `search_engine_batch` for the primary topic plus its
 * "related searches" and "people also ask" blocks. Related searches become
 * `trend_signal`s (rising demand); the questions people ask become
 * `buying_trigger`s (intent + urgency).
 */

type SearchIntentQuery = {
  queries: { query: string; country: string }[];
};

export class SearchIntentProvider extends ResearchProvider<SearchIntentQuery> {
  readonly name = "search_intent";
  readonly title = "Search Intent";
  readonly description = "Rising topics, demand signals, and the questions the audience is actively asking.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["trend_signal", "buying_trigger"];

  transformQuery(params: QueryParams): SearchIntentQuery {
    const country = params.region ?? "us";
    const seeds = [params.query, params.product, params.audienceHint].filter((s): s is string => Boolean(s));
    return { queries: seeds.map((query) => ({ query, country })) };
  }

  async extractData(query: SearchIntentQuery, ctx: ProviderRunContext): Promise<Record<string, unknown>> {
    const client = getBrightDataClient();
    const responses = await client.searchEngineBatch(query.queries, { signal: ctx.signal });
    return { responses };
  }

  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const responses = (raw.responses as BrightDataSearchResponse[] | undefined) ?? [];
    const limit = params.limit ?? 12;

    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];

    for (const response of responses) {
      const related = response.relatedSearches ?? [];
      related.forEach((topic, i) => {
        const citation = toCitation(this.name, {
          url: `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
          title: `Related: ${topic}`,
          confidence: 0.66,
        });
        sources.push(citation);
        items.push({
          kind: "trend_signal",
          data: {
            topic,
            velocity: estimateVelocityFromRank(i + 1),
            volume: estimateVolumeFromRank(i + 1, 70000),
            sentiment: 0,
            source: "search_intent",
            timeSeries: [],
            sources: [citation],
          },
        });
      });

      const paa = response.peopleAlsoAsk ?? [];
      for (const q of paa) {
        const urgency: "low" | "medium" | "high" = /now|2026|before|inflation|hit|risk/i.test(q.question)
          ? "high"
          : /how|what|best|should/i.test(q.question)
            ? "medium"
            : "low";
        const citation = toCitation(this.name, {
          url: `https://www.google.com/search?q=${encodeURIComponent(q.question)}`,
          title: q.question,
          snippet: q.answer,
          confidence: 0.6,
        });
        sources.push(citation);
        items.push({
          kind: "buying_trigger",
          data: {
            trigger: q.question,
            context: q.answer,
            urgency,
            sources: [citation],
          },
        });
      }
    }

    const trends = dedupeBy(
      items.filter((i) => i.kind === "trend_signal"),
      (i) => (i.kind === "trend_signal" ? i.data.topic.toLowerCase() : ""),
    );
    const triggers = dedupeBy(
      items.filter((i) => i.kind === "buying_trigger"),
      (i) => (i.kind === "buying_trigger" ? i.data.trigger.toLowerCase() : ""),
    );

    return { items: [...trends, ...triggers].slice(0, limit * 2), sources };
  }
}
