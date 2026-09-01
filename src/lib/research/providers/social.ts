import { getBrightDataClient, type BrightDataSearchResponse } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import type { QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import { dedupeBy, estimateVelocityFromRank, inferPlatformFromUrl, roughSentiment, toCitation } from "./utils";

/**
 * Social Listening provider.
 *
 * Bright Data tools: tries Pro `web_data_x_posts` / `web_data_tiktok_posts` and,
 * when Pro is unavailable, degrades to `search_engine` over TikTok / X / YouTube.
 * Yields `community_insight`s (conversations + formats) and `trend_signal`s
 * (share of voice by topic/format).
 */

type SocialQuery = {
  queries: { query: string; country: string }[];
};

export class SocialListeningProvider extends ResearchProvider<SocialQuery> {
  readonly name = "social_listening";
  readonly title = "Social Listening";
  readonly description = "Conversations, winning formats, and share of voice across TikTok, X, and YouTube.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["community_insight", "trend_signal"];

  transformQuery(params: QueryParams): SocialQuery {
    const country = params.region ?? "us";
    const topic = params.query;
    return {
      queries: [
        { query: `${topic} tiktok`, country },
        { query: `${topic} youtube`, country },
        { query: `${topic} x.com`, country },
      ],
    };
  }

  async extractData(query: SocialQuery, ctx: ProviderRunContext): Promise<Record<string, unknown>> {
    const client = getBrightDataClient();
    const pro =
      (await client.webData("x_posts", { query: query.queries[0]?.query }, { signal: ctx.signal })) ??
      (await client.webData("tiktok_posts", { query: query.queries[0]?.query }, { signal: ctx.signal }));
    const responses = await client.searchEngineBatch(query.queries, { signal: ctx.signal });
    return { pro, responses };
  }

  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const responses = (raw.responses as BrightDataSearchResponse[] | undefined) ?? [];
    const limit = params.limit ?? 12;

    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];

    const hits = responses.flatMap((r) => r.results);
    hits.forEach((hit, i) => {
      const content = hit.snippet?.trim();
      if (!content) return;
      const platform = inferPlatformFromUrl(hit.url);
      const citation = toCitation(this.name, { url: hit.url, title: hit.title, snippet: content, confidence: 0.6 });
      sources.push(citation);

      items.push({
        kind: "community_insight",
        data: {
          sourceUrl: hit.url,
          platform,
          content,
          sentiment: roughSentiment(content),
          sources: [citation],
        },
      });
      if (hit.title) {
        items.push({
          kind: "trend_signal",
          data: {
            topic: hit.title.replace(/\s[-|].*$/, "").trim(),
            velocity: estimateVelocityFromRank((hit.position ?? i + 1)),
            sentiment: roughSentiment(content),
            source: `social:${platform}`,
            timeSeries: [],
            sources: [citation],
          },
        });
      }
    });

    const insights = dedupeBy(
      items.filter((i) => i.kind === "community_insight"),
      (i) => (i.kind === "community_insight" ? i.data.content.slice(0, 60).toLowerCase() : ""),
    );
    const trends = dedupeBy(
      items.filter((i) => i.kind === "trend_signal"),
      (i) => (i.kind === "trend_signal" ? i.data.topic.toLowerCase() : ""),
    );

    return { items: [...insights, ...trends].slice(0, limit * 2), sources };
  }
}
