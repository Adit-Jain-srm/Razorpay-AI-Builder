import { getBrightDataClient, type BrightDataSearchResponse } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import type { QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import { dedupeBy, estimateVelocityFromRank, estimateVolumeFromRank, roughSentiment, toCitation } from "./utils";

/**
 * News & Industry provider.
 *
 * Bright Data tools: `search_engine_batch` over news queries (+ optional
 * `scrape_as_markdown` of articles). Yields `trend_signal`s describing market
 * shifts, regulation, and competitive moves relevant to the audience.
 */

type NewsQuery = {
  queries: { query: string; country: string }[];
};

export class NewsIndustryProvider extends ResearchProvider<NewsQuery> {
  readonly name = "news_industry";
  readonly title = "News & Industry";
  readonly description = "Market shifts, regulation, and headlines moving the audience right now.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["trend_signal"];

  transformQuery(params: QueryParams): NewsQuery {
    const country = params.region ?? "us";
    const topic = params.industry ?? params.query;
    return {
      queries: [
        { query: `${topic} news 2026`, country },
        { query: `${topic} inflation news`, country },
      ],
    };
  }

  async extractData(query: NewsQuery, ctx: ProviderRunContext): Promise<Record<string, unknown>> {
    const client = getBrightDataClient();
    const responses = await client.searchEngineBatch(query.queries, { signal: ctx.signal });
    return { responses };
  }

  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const responses = (raw.responses as BrightDataSearchResponse[] | undefined) ?? [];
    const limit = params.limit ?? 10;

    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];

    const hits = responses.flatMap((r) => r.results);
    hits.forEach((hit, i) => {
      const headline = hit.title?.trim();
      if (!headline) return;
      const citation = toCitation(this.name, {
        url: hit.url,
        title: headline,
        snippet: hit.snippet,
        confidence: 0.7,
      });
      sources.push(citation);
      items.push({
        kind: "trend_signal",
        data: {
          topic: headline,
          velocity: estimateVelocityFromRank((hit.position ?? i + 1)),
          volume: estimateVolumeFromRank((hit.position ?? i + 1), 120000),
          sentiment: roughSentiment(`${headline} ${hit.snippet ?? ""}`),
          source: "news",
          timeSeries: [],
          sources: [citation],
        },
      });
    });

    const deduped = dedupeBy(items, (i) => (i.kind === "trend_signal" ? i.data.topic.toLowerCase() : "")).slice(0, limit);
    return { items: deduped, sources };
  }
}
