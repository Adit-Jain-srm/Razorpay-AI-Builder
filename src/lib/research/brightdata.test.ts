import { describe, expect, it, vi } from "vitest";

import {
  HttpBrightDataClient,
  ResilientBrightDataClient,
  parseSerpJson,
  type BrightDataScrapeResponse,
  type BrightDataSearchResponse,
  type SearchEngineInput,
} from "./brightdata";

/**
 * Recorded sample of a REAL Bright Data SERP response (zone `serp_api1`, a Google
 * search URL with `brd_json=1`). Captured live on 2026-06-30 via
 * `npm run smoke:brightdata`: `brd_json=1` returns `application/json` whose
 * top-level keys are `general, input, navigation, organic, top_ads, pagination,
 * related`, with `organic[]` items shaped `{ title, link, description, rank }`.
 * Trimmed to the fields our parser reads so the offline suite tracks the live API.
 */
const RECORDED_SERP_JSON = JSON.stringify({
  general: { search_engine: "google", query: "retirement income newsletter", results_cnt: 9 },
  organic: [
    {
      title: "Free E-Newsletter",
      link: "https://retirementincomejournal.com/free-e-newsletter/",
      description:
        "Retirement Income Journal is a weekly, digital-only business-to-business news publication and website for life insurers, asset managers, financial advisors, ...Read more",
      rank: 1,
    },
    {
      title: "The Retirement Income Newsletter",
      link: "https://example-retirement.com/newsletter",
      description: "Monthly strategies for generating durable income in retirement.",
      rank: 2,
    },
  ],
  related: [
    "best retirement income newsletter",
    "free retirement newsletters",
    { query: "retirement income strategies 2026" },
  ],
  pagination: { current_page: 1 },
});

describe("parseSerpJson", () => {
  it("normalizes organic results, related searches, and people-also-ask", () => {
    const raw = JSON.stringify({
      organic: [
        { link: "https://a.com", title: "A", description: "desc a", rank: 1 },
        { url: "https://b.com", title: "B", snippet: "desc b" },
      ],
      related: ["related one", { query: "related two" }],
      people_also_ask: [{ question: "How?", answer: "Like this." }, "Plain question?"],
    });

    const parsed = parseSerpJson(raw, { query: "retirement", engine: "google" });
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0].url).toBe("https://a.com");
    expect(parsed.relatedSearches).toEqual(["related one", "related two"]);
    expect(parsed.peopleAlsoAsk).toEqual([
      { question: "How?", answer: "Like this." },
      { question: "Plain question?" },
    ]);
  });

  it("throws on a non-JSON body", () => {
    expect(() => parseSerpJson("<html>blocked</html>", { query: "x" })).toThrow();
  });
});

describe("parseSerpJson against the recorded live response", () => {
  it("parses the real brd_json=1 shape (organic {title,link,description,rank} + related)", () => {
    const parsed = parseSerpJson(RECORDED_SERP_JSON, {
      query: "retirement income newsletter",
      engine: "google",
      country: "us",
    });
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]).toMatchObject({
      title: "Free E-Newsletter",
      url: "https://retirementincomejournal.com/free-e-newsletter/",
      position: 1,
    });
    expect(parsed.results[0].snippet).toContain("Retirement Income Journal");
    // `related` items may be plain strings or `{ query }` objects - both normalize.
    expect(parsed.relatedSearches).toEqual([
      "best retirement income newsletter",
      "free retirement newsletters",
      "retirement income strategies 2026",
    ]);
  });
});

/** Captures the args of a single mocked fetch call and returns a canned body. */
function captureFetch(body: string, status = 200): { calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(body, { status });
  };
  vi.stubGlobal("fetch", fetchMock);
  return { calls };
}

describe("HttpBrightDataClient", () => {
  it("posts to Bright Data and parses the SERP JSON body", async () => {
    const fetchMock = async (): Promise<Response> =>
      new Response(JSON.stringify({ organic: [{ link: "https://x.com", title: "X" }] }), { status: 200 });
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const http = new HttpBrightDataClient("token-123");
      const res = await http.searchEngine({ query: "inflation" });
      expect(res.results[0].url).toBe("https://x.com");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("sends the live SERP request shape: POST /request, zone, brd_json url, raw format, bearer auth", async () => {
    const { calls } = captureFetch(RECORDED_SERP_JSON);
    const http = new HttpBrightDataClient("token-123");
    const res = await http.searchEngine({ query: "retirement income newsletter", engine: "google", country: "us", count: 15 });

    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe("https://api.brightdata.com/request");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer token-123");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(typeof body.zone).toBe("string");
    expect((body.zone as string).length).toBeGreaterThan(0);
    expect(body.format).toBe("raw");
    expect(String(body.url)).toContain("www.google.com/search");
    expect(String(body.url)).toContain("brd_json=1");
    expect(res.results).toHaveLength(2);
  });

  it("sends the live Unlocker scrape request shape: raw format + data_format markdown", async () => {
    const { calls } = captureFetch("# Example Domain\n\nHello");
    const http = new HttpBrightDataClient("token-123");
    const res = await http.scrapeAsMarkdown("https://example.com/");

    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
    expect(body.url).toBe("https://example.com/");
    expect(body.format).toBe("raw");
    expect(body.data_format).toBe("markdown");
    expect(typeof body.zone).toBe("string");
    expect(res.markdown).toContain("Example Domain");
  });
});

/** Minimal fake HTTP client to drive the resilient wrapper without a network. */
function fakeHttp(overrides: {
  search?: (input: SearchEngineInput) => Promise<BrightDataSearchResponse>;
  scrape?: (url: string) => Promise<BrightDataScrapeResponse>;
}): HttpBrightDataClient {
  return {
    isConfigured: true,
    async isProAvailable() {
      return false;
    },
    async searchEngine(input: SearchEngineInput) {
      return overrides.search ? overrides.search(input) : { query: input.query, engine: "google" as const, results: [] };
    },
    async scrapeAsMarkdown(url: string) {
      return overrides.scrape ? overrides.scrape(url) : { url, markdown: "" };
    },
    async searchEngineBatch() {
      return [];
    },
    async scrapeBatch() {
      return [];
    },
    async webData() {
      return null;
    },
  } as unknown as HttpBrightDataClient;
}

describe("ResilientBrightDataClient", () => {
  it("serves seeded fixtures when there is no HTTP client (no token)", async () => {
    const client = new ResilientBrightDataClient(null);
    const search = await client.searchEngine({ query: "near-retirees inflation" });
    expect(search.results.length).toBeGreaterThan(0);
    const scrape = await client.scrapeAsMarkdown("https://www.reddit.com/r/retirement/x");
    expect(scrape.markdown).toBeTruthy();
  });

  it("degrades to fixtures (never throws) when the HTTP call fails", async () => {
    const client = new ResilientBrightDataClient(
      fakeHttp({
        search: async () => {
          throw new Error("boom");
        },
      }),
    );
    const search = await client.searchEngine({ query: "retirement ads" });
    expect(search.results.length).toBeGreaterThan(0);
  });

  it("read-through caches identical queries (no refetch)", async () => {
    let calls = 0;
    const client = new ResilientBrightDataClient(
      fakeHttp({
        search: async (input) => {
          calls += 1;
          return { query: input.query, engine: "google", results: [{ url: "https://x.com", title: "X" }] };
        },
      }),
    );
    await client.searchEngine({ query: "same" });
    await client.searchEngine({ query: "same" });
    expect(calls).toBe(1);
  });

  it("falls back to fixtures when a live result set is empty", async () => {
    const client = new ResilientBrightDataClient(
      fakeHttp({ search: async (input) => ({ query: input.query, engine: "google", results: [] }) }),
    );
    const search = await client.searchEngine({ query: "retirement inflation" });
    expect(search.results.length).toBeGreaterThan(0);
  });
});
