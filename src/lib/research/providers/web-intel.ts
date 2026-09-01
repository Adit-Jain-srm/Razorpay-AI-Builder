import { getBrightDataClient, type BrightDataScrapeResponse, type BrightDataSearchResponse } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import type { QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import {
  classifyHooks,
  dedupeBy,
  extractMarkdownHeading,
  firstParagraph,
  inferPlatformFromUrl,
  toCitation,
} from "./utils";

/**
 * Web Intelligence provider.
 *
 * Bright Data tools: `search_engine` to find competitor sites + `scrape_batch`
 * to read their positioning and funnel. Yields `competitor_ad`s (landing-page
 * positioning) and `buying_trigger`s extracted from lead-magnet CTAs.
 */

type WebIntelQuery = {
  searchQuery: { query: string; country: string };
  seedUrls: string[];
};

export class WebIntelligenceProvider extends ResearchProvider<WebIntelQuery> {
  readonly name = "web_intel";
  readonly title = "Web Intelligence";
  readonly description = "Competitor positioning, lead magnets, and funnel structure from their own pages.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["competitor_ad", "buying_trigger"];

  transformQuery(params: QueryParams): WebIntelQuery {
    const country = params.region ?? "us";
    const seedUrls = (params.competitors ?? [])
      .map((c) => `https://www.${c.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com/`)
      .slice(0, 4);
    return {
      searchQuery: { query: `${params.product ?? params.query} newsletter positioning pricing`, country },
      seedUrls,
    };
  }

  async extractData(query: WebIntelQuery, ctx: ProviderRunContext): Promise<Record<string, unknown>> {
    const client = getBrightDataClient();
    const search = await client.searchEngine(query.searchQuery, { signal: ctx.signal });
    const discovered = search.results.slice(0, 3).map((r) => r.url);
    const urls = [...new Set([...query.seedUrls, ...discovered])].slice(0, 4);
    const scrapes = urls.length ? await client.scrapeBatch(urls, { signal: ctx.signal }) : [];
    return { search, scrapes };
  }

  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const search = raw.search as BrightDataSearchResponse | undefined;
    const scrapes = (raw.scrapes as BrightDataScrapeResponse[] | undefined) ?? [];
    const limit = params.limit ?? 8;

    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];

    for (const scrape of scrapes) {
      const advertiser = extractMarkdownHeading(scrape.markdown, 1) ?? new URL(scrape.url).hostname.replace(/^www\./, "");
      const positioning = extractMarkdownHeading(scrape.markdown, 2) ?? firstParagraph(scrape.markdown);
      const tagline = firstParagraph(scrape.markdown);
      const copy = [positioning, tagline].filter(Boolean).join(" - ");
      if (!copy) continue;

      const citation = toCitation(this.name, { url: scrape.url, title: advertiser, snippet: positioning, confidence: 0.65 });
      sources.push(citation);

      items.push({
        kind: "competitor_ad",
        data: {
          platform: inferPlatformFromUrl(scrape.url),
          advertiser,
          creativeType: "landing_page",
          copy,
          hooksUsed: classifyHooks(scrape.markdown),
          sources: [citation],
        },
      });

      // Lead-magnet CTAs reveal what triggers opt-ins.
      const cta = (scrape.markdown ?? "").match(/(get|download|claim|join)[^.\n]{0,80}(report|guide|blueprint|newsletter|free)/i);
      if (cta) {
        items.push({
          kind: "buying_trigger",
          data: {
            trigger: cta[0].trim(),
            context: `${advertiser} uses this lead magnet to convert visitors.`,
            urgency: "medium",
            sources: [citation],
          },
        });
      }
    }

    // Fold in search snippets as lightweight positioning signals.
    for (const hit of search?.results ?? []) {
      if (!hit.snippet) continue;
      const citation = toCitation(this.name, { url: hit.url, title: hit.title, snippet: hit.snippet, confidence: 0.55 });
      sources.push(citation);
      items.push({
        kind: "competitor_ad",
        data: {
          platform: inferPlatformFromUrl(hit.url),
          advertiser: (hit.title ?? "").split(/\s[-|]\s|\s\|\s/)[0]?.trim() || undefined,
          creativeType: "positioning",
          copy: hit.snippet,
          hooksUsed: classifyHooks(`${hit.title ?? ""} ${hit.snippet}`),
          sources: [citation],
        },
      });
    }

    const ads = dedupeBy(
      items.filter((i) => i.kind === "competitor_ad"),
      (i) => (i.kind === "competitor_ad" ? `${i.data.advertiser}|${i.data.copy?.slice(0, 50)}` : ""),
    ).slice(0, limit);
    const triggers = items.filter((i) => i.kind === "buying_trigger");

    return { items: [...ads, ...triggers], sources };
  }
}
