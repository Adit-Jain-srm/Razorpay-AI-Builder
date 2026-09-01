import { getBrightDataClient, type BrightDataSearchResponse } from "../brightdata";
import { ResearchProvider, type NormalizedOutput, type ProviderRunContext } from "../provider";
import {
  fetchMetaAdLibraryCards,
  metaAdLibraryUrl,
  parseAdCardsFromMarkdown,
  type ScrapedAdCard,
} from "../scraping-browser";
import type { CompetitorAd, QueryParams, SourceCitation, StandardModel, StandardModelKind } from "../standard-models";
import { classifyHooks, dedupeBy, inferCreativeType, inferPlatformFromUrl, toCitation } from "./utils";

/**
 * Competitor Ad Research provider.
 *
 * Bright Data tools, with a graceful fallback chain for the JS-heavy Meta Ad
 * Library:
 *   1. Scraping Browser (remote Puppeteer) - navigates the live Ad Library and
 *      extracts visible ad cards (advertiser + copy).
 *   2. Web Unlocker (`scrape_as_markdown`) of the Ad Library page when the
 *      browser is unavailable.
 *   3. Seeded ad-library fixture (served by the resilient client) as the final
 *      safety net.
 * Plus `search_engine` (+ `searchEngineBatch`) over the Ad Library and Google.
 *
 * Yields `CompetitorAd` standard models: advertiser, copy, the hooks they lean
 * on, and platform. It NEVER throws to the orchestrator - every fallback is
 * caught and degraded.
 */

type CompetitorAdsQuery = {
  /** The core product/audience term used to search the Meta Ad Library. */
  term: string;
  queries: { query: string; country: string }[];
};

export class CompetitorAdsProvider extends ResearchProvider<CompetitorAdsQuery> {
  readonly name = "competitor_ads";
  readonly title = "Competitor Ad Research";
  readonly description = "Active competitor ad creatives, angles, and hooks from the Meta Ad Library and search.";
  readonly produces: ReadonlyArray<StandardModelKind> = ["competitor_ad"];

  transformQuery(params: QueryParams): CompetitorAdsQuery {
    const country = params.region ?? "us";
    const base = params.product ?? params.query;
    const queries = [
      { query: `${base} ads`, country },
      { query: `${base} ad library`, country },
      ...(params.competitors ?? []).map((c) => ({ query: `${c} facebook ads library`, country })),
    ];
    return { term: base, queries };
  }

  async extractData(query: CompetitorAdsQuery, ctx: ProviderRunContext): Promise<Record<string, unknown>> {
    const client = getBrightDataClient();
    // Independent fetches run in parallel; both degrade internally and never throw.
    const [responses, adCards] = await Promise.all([
      client.searchEngineBatch(query.queries, { signal: ctx.signal }),
      this.collectAdLibrary(query, ctx),
    ]);
    return { responses, adCards };
  }

  /**
   * Resolves Meta Ad Library cards through the fallback chain:
   * Scraping Browser -> Web Unlocker markdown -> seeded fixture (via the
   * resilient client). Always resolves to an array; never throws.
   */
  private async collectAdLibrary(query: CompetitorAdsQuery, ctx: ProviderRunContext): Promise<ScrapedAdCard[]> {
    const country = query.queries[0]?.country ?? "us";

    // 1) Scraping Browser (JS-heavy Ad Library). null => unavailable/empty.
    const fromBrowser = await fetchMetaAdLibraryCards(query.term, country, { signal: ctx.signal }).catch(() => null);
    if (fromBrowser && fromBrowser.length > 0) return fromBrowser;

    // 2) Web Unlocker markdown. The resilient client returns the seeded
    //    ad-library fixture on any upstream failure, so this also covers (3).
    try {
      const client = getBrightDataClient();
      const scrape = await client.scrapeAsMarkdown(metaAdLibraryUrl(query.term, country), { signal: ctx.signal });
      return parseAdCardsFromMarkdown(scrape.markdown).map((card) => ({ ...card, url: card.url ?? scrape.url }));
    } catch {
      return [];
    }
  }

  transformData(raw: Record<string, unknown>, params: QueryParams): NormalizedOutput {
    const responses = (raw.responses as BrightDataSearchResponse[] | undefined) ?? [];
    const adCards = (raw.adCards as ScrapedAdCard[] | undefined) ?? [];
    const limit = params.limit ?? 12;

    const items: StandardModel[] = [];
    const sources: SourceCitation[] = [];

    // Live Meta Ad Library cards first - highest-signal active creatives.
    for (const card of adCards) {
      const copy = card.copy?.trim();
      if (!copy) continue;
      const citation = toCitation(this.name, {
        url: card.url,
        title: card.advertiser,
        snippet: copy,
        confidence: 0.78,
      });
      sources.push(citation);
      const ad: CompetitorAd = {
        platform: "meta",
        advertiser: card.advertiser,
        creativeType: "image",
        copy,
        hooksUsed: classifyHooks(`${card.advertiser ?? ""} ${copy}`),
        sources: [citation],
      };
      items.push({ kind: "competitor_ad", data: ad });
    }

    // SERP-derived ads.
    const hits = responses.flatMap((r) => r.results);
    for (const hit of hits) {
      const advertiser = (hit.title ?? "").split(/\s[-|\u2013\u2014]\s|\s\|\s/)[0]?.trim() || undefined;
      const copy = hit.snippet?.trim();
      if (!copy) continue;

      const citation = toCitation(this.name, {
        url: hit.url,
        title: hit.title,
        snippet: copy,
        confidence: 0.7,
      });
      sources.push(citation);

      const ad: CompetitorAd = {
        platform: inferPlatformFromUrl(hit.url),
        advertiser,
        creativeType: inferCreativeType(hit.url),
        copy,
        hooksUsed: classifyHooks(`${hit.title ?? ""} ${copy}`),
        sources: [citation],
      };
      items.push({ kind: "competitor_ad", data: ad });
    }

    const deduped = dedupeBy(items, (i) => (i.kind === "competitor_ad" ? `${i.data.advertiser}|${i.data.copy}` : "")).slice(0, limit);
    return { items: deduped, sources };
  }
}
