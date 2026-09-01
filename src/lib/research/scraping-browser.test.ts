import { describe, expect, it, vi } from "vitest";

// Mock the remote browser driver so the suite stays fully offline. The dynamic
// `import("puppeteer-core")` inside scraping-browser resolves to this mock.
vi.mock("puppeteer-core", () => ({
  default: { connect: vi.fn() },
}));

import puppeteer, { type Browser } from "puppeteer-core";

import { brightDataFixtures } from "./fixtures/brightdata-fixtures";
import {
  fetchMetaAdLibraryCards,
  isScrapingBrowserConfigured,
  metaAdLibraryUrl,
  parseAdCardsFromMarkdown,
  parseMetaAdCards,
  withScrapingBrowser,
} from "./scraping-browser";

const connectMock = vi.mocked(puppeteer.connect);

/** Builds a fake remote browser + page that records its lifecycle calls. */
function makeFakeBrowser(opts: { evaluateResult?: unknown } = {}) {
  const page = {
    setDefaultNavigationTimeout: vi.fn(),
    setDefaultTimeout: vi.fn(),
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(null),
    evaluate: vi.fn().mockResolvedValue(opts.evaluateResult ?? []),
    title: vi.fn().mockResolvedValue("Example Domain"),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return { browser, page };
}

const asBrowser = (b: ReturnType<typeof makeFakeBrowser>["browser"]): Browser => b as unknown as Browser;

describe("metaAdLibraryUrl", () => {
  it("uppercases the country and encodes the query", () => {
    const url = metaAdLibraryUrl("retirement income", "us");
    expect(url).toContain("country=US");
    expect(url).toContain("q=retirement%20income");
    expect(url).toContain("facebook.com/ads/library");
  });
});

describe("parseMetaAdCards", () => {
  it("extracts advertiser + copy and strips the Library ID chrome", () => {
    const cards = parseMetaAdCards([
      "Acme Capital Sponsored Inflation will eat your savings. Get the free guide. Library ID: 123456789",
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].advertiser).toBe("Acme Capital");
    expect(cards[0].copy).toContain("Inflation will eat your savings");
    expect(cards[0].copy).not.toMatch(/Library ID/i);
  });

  it("dedupes repeated identical cards and skips empty / id-only blocks", () => {
    const cards = parseMetaAdCards([
      "Foo Capital Sponsored Same headline here for the ad. Library ID: 1",
      "Foo Capital Sponsored Same headline here for the ad. Library ID: 2",
      "Library ID: 3",
    ]);
    expect(cards).toHaveLength(1);
  });
});

describe("parseAdCardsFromMarkdown", () => {
  it("distills the seeded ad-library fixture into a card", () => {
    const cards = parseAdCardsFromMarkdown(brightDataFixtures.scrapeAdLibrary.markdown);
    expect(cards).toHaveLength(1);
    expect(cards[0].advertiser).toBe("Stansberry Research");
    expect(cards[0].copy).toContain("Inflation is quietly destroying");
  });

  it("returns an empty array for missing markdown", () => {
    expect(parseAdCardsFromMarkdown(undefined)).toEqual([]);
  });
});

describe("withScrapingBrowser", () => {
  it("returns null and never connects when the endpoint is unset", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "");
    expect(isScrapingBrowserConfigured()).toBe(false);
    const result = await withScrapingBrowser(async () => "ok");
    expect(result).toBeNull();
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("runs the callback and always closes the page + disconnects (no leak)", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "wss://brd.example:9222");
    const { browser, page } = makeFakeBrowser();
    connectMock.mockResolvedValue(asBrowser(browser));

    const result = await withScrapingBrowser(async () => "done", { retries: 0 });

    expect(result).toBe("done");
    expect(browser.newPage).toHaveBeenCalledTimes(1);
    expect(page.close).toHaveBeenCalledTimes(1);
    expect(browser.disconnect).toHaveBeenCalledTimes(1);
  });

  it("returns null (never throws) on connect failure", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "wss://brd.example:9222");
    connectMock.mockRejectedValue(new Error("connect refused"));

    const result = await withScrapingBrowser(async () => "x", { retries: 0 });

    expect(result).toBeNull();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("disconnects even when the callback throws, and returns null", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "wss://brd.example:9222");
    const { browser, page } = makeFakeBrowser();
    connectMock.mockResolvedValue(asBrowser(browser));

    const result = await withScrapingBrowser(async () => {
      throw new Error("boom");
    }, { retries: 0 });

    expect(result).toBeNull();
    expect(page.close).toHaveBeenCalledTimes(1);
    expect(browser.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("fetchMetaAdLibraryCards", () => {
  it("returns null when the browser is unconfigured (caller falls back)", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "");
    const cards = await fetchMetaAdLibraryCards("retirement income", "us");
    expect(cards).toBeNull();
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("returns parsed cards (with citation url) when the browser yields card text", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "wss://brd.example:9222");
    const { browser } = makeFakeBrowser({
      evaluateResult: [
        "Retirement Watch Sponsored Forget CDs. This income strategy pays up to 8%. Library ID: 987654321",
      ],
    });
    connectMock.mockResolvedValue(asBrowser(browser));

    const cards = await fetchMetaAdLibraryCards("retirement income", "us");
    expect(cards).not.toBeNull();
    expect(cards).toHaveLength(1);
    expect(cards?.[0].advertiser).toBe("Retirement Watch");
    expect(cards?.[0].copy).toContain("income strategy pays up to 8%");
    expect(cards?.[0].url).toContain("country=US");
  });

  it("returns null when the browser extracts no cards", async () => {
    vi.stubEnv("BRIGHTDATA_BROWSER_WS", "wss://brd.example:9222");
    const { browser } = makeFakeBrowser({ evaluateResult: [] });
    connectMock.mockResolvedValue(asBrowser(browser));

    const cards = await fetchMetaAdLibraryCards("retirement income", "us");
    expect(cards).toBeNull();
  });
});
