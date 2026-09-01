import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResilientBrightDataClient, resetBrightDataClient, setBrightDataClient } from "../brightdata";
import { brightDataFixtures } from "../fixtures/brightdata-fixtures";
import type { QueryParams, StandardModel, StandardModelKind } from "../standard-models";
import { CompetitorAdsProvider } from "./competitor-ads";
import { NewsIndustryProvider } from "./news";
import { RedditCommunityProvider } from "./reddit";
import { SearchIntentProvider } from "./search-intent";
import { SocialListeningProvider } from "./social";
import { WebIntelligenceProvider } from "./web-intel";

const params: QueryParams = {
  query: "retirement income newsletter for near-retirees worried about inflation",
  industry: "financial newsletters",
  product: "retirement income newsletter",
  audienceHint: "near-retirees worried about inflation",
  region: "us",
  competitors: ["Motley Fool"],
};

function byKind(items: StandardModel[], kind: StandardModelKind): StandardModel[] {
  return items.filter((i) => i.kind === kind);
}

describe("CompetitorAdsProvider", () => {
  it("transformQuery builds ad-intent queries", () => {
    const q = new CompetitorAdsProvider().transformQuery(params);
    expect(q.queries.some((x) => x.query.includes("ads"))).toBe(true);
    expect(q.queries.some((x) => x.query.includes("Motley Fool"))).toBe(true);
  });

  it("transformData maps SERP hits to competitor ads with hooks", () => {
    const out = new CompetitorAdsProvider().transformData({ responses: [brightDataFixtures.serpCompetitorAds] }, params);
    const ads = byKind(out.items, "competitor_ad");
    expect(ads.length).toBeGreaterThanOrEqual(5);
    const first = ads[0];
    if (first.kind !== "competitor_ad") throw new Error("expected competitor_ad");
    expect(first.data.advertiser).toBe("Motley Fool");
    expect(first.data.platform).toBe("meta");
    expect(first.data.hooksUsed.length).toBeGreaterThan(0);
    expect(out.sources.length).toBeGreaterThan(0);
  });

  it("transformData places live ad-library cards (meta) ahead of SERP ads", () => {
    const adCards = [
      {
        advertiser: "Stansberry Research",
        copy: "Inflation is quietly destroying your nest egg. Here's the 3-fund fix.",
        url: "https://www.facebook.com/ads/library/?q=stansberry%20inflation",
      },
    ];
    const out = new CompetitorAdsProvider().transformData(
      { responses: [brightDataFixtures.serpCompetitorAds], adCards },
      params,
    );
    const ads = byKind(out.items, "competitor_ad");
    const first = ads[0];
    if (first.kind !== "competitor_ad") throw new Error("expected competitor_ad");
    expect(first.data.advertiser).toBe("Stansberry Research");
    expect(first.data.platform).toBe("meta");
    expect(first.data.creativeType).toBe("image");
    expect(first.data.hooksUsed.length).toBeGreaterThan(0);
  });

  it("transformData tolerates missing adCards (SERP-only, backward compatible)", () => {
    const out = new CompetitorAdsProvider().transformData({ responses: [brightDataFixtures.serpCompetitorAds] }, params);
    expect(byKind(out.items, "competitor_ad").length).toBeGreaterThanOrEqual(5);
  });
});

describe("SearchIntentProvider", () => {
  it("maps related searches to trends and PAA to buying triggers", () => {
    const out = new SearchIntentProvider().transformData({ responses: [brightDataFixtures.serpSearchIntent] }, params);
    expect(byKind(out.items, "trend_signal").length).toBe(6);
    expect(byKind(out.items, "buying_trigger").length).toBe(4);
  });
});

describe("RedditCommunityProvider", () => {
  it("maps reddit SERP + scraped comments to community insights and pain points", () => {
    const out = new RedditCommunityProvider().transformData(
      { responses: [brightDataFixtures.serpReddit], scrapes: [brightDataFixtures.scrapeRedditThread] },
      params,
    );
    expect(byKind(out.items, "community_insight").length).toBeGreaterThanOrEqual(5);
    expect(byKind(out.items, "pain_point").length).toBeGreaterThanOrEqual(5);
  });
});

describe("NewsIndustryProvider", () => {
  it("maps headlines to trend signals", () => {
    const out = new NewsIndustryProvider().transformData({ responses: [brightDataFixtures.serpNews] }, params);
    const trends = byKind(out.items, "trend_signal");
    expect(trends.length).toBe(4);
  });
});

describe("SocialListeningProvider", () => {
  it("maps social SERP to community insights and trends", () => {
    const out = new SocialListeningProvider().transformData({ responses: [brightDataFixtures.serpSocial] }, params);
    expect(byKind(out.items, "community_insight").length).toBe(3);
    expect(byKind(out.items, "trend_signal").length).toBeGreaterThan(0);
  });
});

describe("WebIntelligenceProvider", () => {
  it("maps scraped pages + search to competitor positioning and triggers", () => {
    const out = new WebIntelligenceProvider().transformData(
      { search: brightDataFixtures.serpWebIntel, scrapes: [brightDataFixtures.scrapeCompetitorHome] },
      params,
    );
    expect(byKind(out.items, "competitor_ad").length).toBeGreaterThanOrEqual(2);
    expect(byKind(out.items, "buying_trigger").length).toBeGreaterThanOrEqual(1);
  });
});

describe("provider.run end-to-end against the fixture client (no network)", () => {
  beforeEach(() => {
    // Guarantee the Scraping Browser is treated as unconfigured so the suite stays
    // offline (no puppeteer connect, no network) regardless of the host env.
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "");
    setBrightDataClient(new ResilientBrightDataClient(null));
  });
  afterEach(() => resetBrightDataClient());

  it("competitor_ads degrades through the ad-library chain to seeded meta cards", async () => {
    const result = await new CompetitorAdsProvider().run(params);
    expect(result.status).toBe("success");
    const metaAds = result.items.filter((i) => i.kind === "competitor_ad" && i.data.platform === "meta");
    expect(metaAds.length).toBeGreaterThan(0);
  });

  it("every provider returns success with normalized items and never throws", async () => {
    const providers = [
      new CompetitorAdsProvider(),
      new SearchIntentProvider(),
      new RedditCommunityProvider(),
      new NewsIndustryProvider(),
      new SocialListeningProvider(),
      new WebIntelligenceProvider(),
    ];

    for (const provider of providers) {
      const result = await provider.run(params);
      expect(result.status).toBe("success");
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.provider).toBe(provider.name);
    }
  });
});
