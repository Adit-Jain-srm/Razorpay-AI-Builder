import { getBrightDataClient, type BrightDataScrapeResponse, type BrightDataSearchResponse } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import type { QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import { clamp01, dedupeBy, extractMarkdownBullets, firstSentence, roughSentiment, summarizePain, toCitation } from "./utils";

/**
 * Reddit / Community provider.
 *
 * Bright Data tools: tries the Pro `web_data_reddit_posts` dataset and, when Pro
 * is unavailable, degrades to `search_engine` (`site:reddit.com`) +
 * `scrape_as_markdown` of the top thread. Yields `community_insight`s (the
 * audience's own words) and `pain_point`s extracted from them.
 */

type RedditQuery = {
  queries: { query: string; country: string }[];
};

export class RedditCommunityProvider extends ResearchProvider<RedditQuery> {
  readonly name = "reddit_community";
  readonly title = "Reddit & Community";
  readonly description = "Pain points and vocabulary in the audience's own words from Reddit and forums.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["community_insight", "pain_point"];

  transformQuery(params: QueryParams): RedditQuery {
    const country = params.region ?? "us";
    const topic = params.audienceHint ?? params.query;
    return {
      queries: [
        { query: `site:reddit.com ${topic}`, country },
        { query: `site:reddit.com ${topic} frustrated OR worried OR help`, country },
      ],
    };
  }

  async extractData(query: RedditQuery, ctx: ProviderRunContext): Promise<Record<string, unknown>> {
    const client = getBrightDataClient();
    // Prefer the Pro structured dataset; null means Pro is off -> degrade.
    const pro = await client.webData("reddit_posts", { query: query.queries[0]?.query }, { signal: ctx.signal });

    const responses = await client.searchEngineBatch(query.queries, { signal: ctx.signal });
    const threadUrls = responses
      .flatMap((r) => r.results)
      .filter((r) => r.url.includes("reddit.com"))
      .slice(0, 2)
      .map((r) => r.url);
    const scrapes = threadUrls.length ? await client.scrapeBatch(threadUrls, { signal: ctx.signal }) : [];
    return { pro, responses, scrapes };
  }

  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const responses = (raw.responses as BrightDataSearchResponse[] | undefined) ?? [];
    const scrapes = (raw.scrapes as BrightDataScrapeResponse[] | undefined) ?? [];
    const limit = params.limit ?? 15;

    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];

    for (const hit of responses.flatMap((r) => r.results)) {
      const content = hit.snippet?.trim();
      if (!content) continue;

      const citation = toCitation(this.name, {
        url: hit.url,
        title: hit.title,
        snippet: content,
        confidence: 0.75,
      });
      sources.push(citation);

      const sentiment = roughSentiment(content);
      const summary = summarizePain(content);

      items.push({
        kind: "community_insight",
        data: {
          sourceUrl: hit.url,
          platform: "reddit",
          content,
          painPointExtracted: summary,
          sentiment,
          sources: [citation],
        },
      });
      items.push({
        kind: "pain_point",
        data: {
          summary,
          quote: firstSentence(content, 160),
          intensity: clamp01(Math.abs(sentiment) + 0.3),
          frequency: 0.5,
          sources: [citation],
        },
      });
    }

    // Enrich with quotes scraped from the top thread (comment bullets).
    for (const scrape of scrapes) {
      const bullets = extractMarkdownBullets(scrape.markdown).slice(0, 4);
      for (const bullet of bullets) {
        const citation = toCitation(this.name, { url: scrape.url, title: "Reddit thread comment", snippet: bullet.text, confidence: 0.6 });
        sources.push(citation);
        items.push({
          kind: "community_insight",
          data: {
            sourceUrl: scrape.url,
            platform: "reddit",
            content: bullet.text,
            painPointExtracted: summarizePain(bullet.text),
            sentiment: roughSentiment(bullet.text),
            upvotes: bullet.upvotes,
            sources: [citation],
          },
        });
      }
    }

    const insights = dedupeBy(
      items.filter((i) => i.kind === "community_insight"),
      (i) => (i.kind === "community_insight" ? i.data.content.slice(0, 60).toLowerCase() : ""),
    );
    const pains = dedupeBy(
      items.filter((i) => i.kind === "pain_point"),
      (i) => (i.kind === "pain_point" ? i.data.summary.toLowerCase() : ""),
    );

    return { items: [...insights, ...pains].slice(0, limit * 2), sources };
  }
}
