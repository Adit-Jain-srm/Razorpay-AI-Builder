import { getEnv, isBrightDataConfigured } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withRetry } from "@/lib/resilience";

import { matchFixtureScrape, matchFixtureSearch } from "./fixtures/brightdata-fixtures";

/**
 * Bright Data adapter - the interface research providers call to reach the web.
 *
 * The deployed app runs on Vercel and CANNOT use Cursor's MCP, so this is a real
 * HTTP client to Bright Data's API (`https://api.brightdata.com/request`) using
 * `BRIGHTDATA_API_TOKEN`:
 * - `searchEngine` / `searchEngineBatch` - SERP via the Web Unlocker / SERP zone
 *   (a search-engine URL with `brd_json=1` returns parsed JSON results).
 * - `scrapeAsMarkdown` / `scrapeBatch` - Web Unlocker (`data_format: "markdown"`).
 *
 * Resilience is non-negotiable: every call is wrapped in retry + timeout, results
 * are read-through cached in-memory, and on ANY failure (missing/invalid token,
 * network error, non-200, parse error) the client DEGRADES to seeded fixture data
 * and logs a structured warning. It never throws to the UI.
 *
 * `web_data_*` (Pro structured datasets) is reported unavailable by default so the
 * orchestrator uses the verified free-tier search + scrape path.
 */

export type BrightDataEngine = "google" | "bing" | "yandex";

export interface BrightDataSearchResult {
  title?: string;
  url: string;
  snippet?: string;
  position?: number;
}

export interface PeopleAlsoAsk {
  question: string;
  answer?: string;
}

export interface BrightDataSearchResponse {
  query: string;
  engine: BrightDataEngine;
  results: BrightDataSearchResult[];
  /** "Related searches" / "searches related to" block, when present. */
  relatedSearches?: string[];
  /** "People also ask" block, when present. */
  peopleAlsoAsk?: PeopleAlsoAsk[];
  raw?: unknown;
}

export interface BrightDataScrapeResponse {
  url: string;
  markdown?: string;
  html?: string;
}

export interface BrightDataRequestContext {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface SearchEngineInput {
  query: string;
  engine?: BrightDataEngine;
  /** Two-letter geo, e.g. "us", "gb". */
  country?: string;
  /** Number of results to request. */
  count?: number;
}

export interface BrightDataClient {
  /** Whether the API token is present. */
  readonly isConfigured: boolean;
  /** Whether Pro structured datasets (`web_data_*`) are available. */
  isProAvailable(): Promise<boolean>;

  searchEngine(input: SearchEngineInput, ctx?: BrightDataRequestContext): Promise<BrightDataSearchResponse>;
  searchEngineBatch(queries: SearchEngineInput[], ctx?: BrightDataRequestContext): Promise<BrightDataSearchResponse[]>;
  scrapeAsMarkdown(url: string, ctx?: BrightDataRequestContext): Promise<BrightDataScrapeResponse>;
  scrapeBatch(urls: string[], ctx?: BrightDataRequestContext): Promise<BrightDataScrapeResponse[]>;

  /**
   * Pro structured dataset access (e.g. "reddit_posts", "x_posts"). Resolves
   * `null` when Pro is unavailable so callers degrade to search + scrape.
   */
  webData(dataset: string, input: Record<string, unknown>, ctx?: BrightDataRequestContext): Promise<unknown | null>;
}

const BRIGHTDATA_REQUEST_URL = "https://api.brightdata.com/request";
const DEFAULT_UNLOCKER_ZONE = "mcp_unlocker";

function unlockerZone(): string {
  return getEnv().BRIGHTDATA_WEB_UNLOCKER_ZONE.trim() || DEFAULT_UNLOCKER_ZONE;
}

function serpZone(): string {
  return getEnv().BRIGHTDATA_SERP_ZONE.trim() || unlockerZone();
}

/** Builds a search-engine URL with `brd_json=1` so Bright Data returns parsed SERP JSON. */
function buildSerpUrl(input: SearchEngineInput): string {
  const engine = input.engine ?? "google";
  const q = encodeURIComponent(input.query);
  const country = input.country ?? "us";
  const num = input.count ?? 15;
  switch (engine) {
    case "bing":
      return `https://www.bing.com/search?q=${q}&brd_json=1&cc=${encodeURIComponent(country)}&count=${num}`;
    case "yandex":
      return `https://yandex.com/search/?text=${q}&brd_json=1`;
    case "google":
    default:
      return `https://www.google.com/search?q=${q}&brd_json=1&gl=${encodeURIComponent(country)}&num=${num}`;
  }
}

interface SerpOrganicRaw {
  link?: string;
  url?: string;
  title?: string;
  description?: string;
  snippet?: string;
  rank?: number;
  position?: number;
}

/** Defensively parses Bright Data SERP JSON into our normalized response. */
export function parseSerpJson(text: string, input: SearchEngineInput): BrightDataSearchResponse {
  const engine = input.engine ?? "google";
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new UpstreamError("Bright Data SERP returned non-JSON body", { service: "brightdata" });
  }

  const root = (json ?? {}) as Record<string, unknown>;
  const organicRaw = (Array.isArray(root.organic) ? root.organic : []) as SerpOrganicRaw[];

  const results: BrightDataSearchResult[] = organicRaw
    .map((item, i) => ({
      title: item.title,
      url: item.link ?? item.url ?? "",
      snippet: item.description ?? item.snippet,
      position: item.rank ?? item.position ?? i + 1,
    }))
    .filter((r) => r.url.length > 0);

  const relatedRaw = root.related ?? root.related_searches ?? root.relatedSearches;
  const relatedSearches = Array.isArray(relatedRaw)
    ? relatedRaw
        .map((r) => (typeof r === "string" ? r : ((r as Record<string, unknown>)?.query ?? (r as Record<string, unknown>)?.text)))
        .filter((r): r is string => typeof r === "string")
    : undefined;

  const paaRaw = root.people_also_ask ?? root.peopleAlsoAsk ?? root.related_questions;
  const peopleAlsoAsk: PeopleAlsoAsk[] = [];
  if (Array.isArray(paaRaw)) {
    for (const r of paaRaw) {
      const obj = (r ?? {}) as Record<string, unknown>;
      const question = typeof obj.question === "string" ? obj.question : typeof r === "string" ? r : undefined;
      if (!question) continue;
      const answer = typeof obj.answer === "string" ? obj.answer : undefined;
      peopleAlsoAsk.push(answer === undefined ? { question } : { question, answer });
    }
  }

  return {
    query: input.query,
    engine,
    results,
    relatedSearches,
    peopleAlsoAsk: peopleAlsoAsk.length ? peopleAlsoAsk : undefined,
    raw: json,
  };
}

/**
 * Faithful HTTP client to the Bright Data API. Throws typed errors on failure;
 * the resilient wrapper (below) is responsible for degradation to fixtures.
 */
export class HttpBrightDataClient implements BrightDataClient {
  constructor(private readonly token: string) {}

  get isConfigured(): boolean {
    return this.token.length > 0;
  }

  async isProAvailable(): Promise<boolean> {
    return false;
  }

  private async request(payload: Record<string, unknown>, ctx?: BrightDataRequestContext): Promise<string> {
    return withRetry(
      async (signal) => {
        const response = await fetch(BRIGHTDATA_REQUEST_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new UpstreamError(`Bright Data request failed (${response.status})`, {
            service: "brightdata",
            status: response.status,
            context: { detail: detail.slice(0, 300) },
          });
        }

        return response.text();
      },
      {
        signal: ctx?.signal,
        timeoutMs: ctx?.timeoutMs ?? 25000,
        retries: 2,
        label: "brightdata.request",
        onRetry: (error, attempt, delayMs) =>
          logger.warn("Retrying Bright Data request", { attempt, delayMs, error: String(error) }),
      },
    );
  }

  async searchEngine(input: SearchEngineInput, ctx?: BrightDataRequestContext): Promise<BrightDataSearchResponse> {
    const text = await this.request({ zone: serpZone(), url: buildSerpUrl(input), format: "raw" }, ctx);
    return parseSerpJson(text, input);
  }

  async searchEngineBatch(queries: SearchEngineInput[], ctx?: BrightDataRequestContext): Promise<BrightDataSearchResponse[]> {
    return Promise.all(queries.map((q) => this.searchEngine(q, ctx)));
  }

  async scrapeAsMarkdown(url: string, ctx?: BrightDataRequestContext): Promise<BrightDataScrapeResponse> {
    const markdown = await this.request({ zone: unlockerZone(), url, format: "raw", data_format: "markdown" }, ctx);
    return { url, markdown };
  }

  async scrapeBatch(urls: string[], ctx?: BrightDataRequestContext): Promise<BrightDataScrapeResponse[]> {
    return Promise.all(urls.map((url) => this.scrapeAsMarkdown(url, ctx)));
  }

  async webData(): Promise<unknown | null> {
    // Pro structured datasets require an active Pro account; degrade by default.
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Read-through in-memory cache                                                */
/* -------------------------------------------------------------------------- */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Tiny TTL + size-bounded cache so repeated fetches in a session don't refetch. */
class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly max = 500,
    private readonly ttlMs = 10 * 60 * 1000,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Touch for LRU-ish recency.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * The client research providers actually use. Wraps the HTTP client with:
 * - read-through caching (skip refetching the same query/URL in a session),
 * - graceful degradation to seeded fixtures on missing token / failure,
 * - structured warning logs instead of throwing to the UI.
 */
export class ResilientBrightDataClient implements BrightDataClient {
  private readonly searchCache = new TtlCache<BrightDataSearchResponse>();
  private readonly scrapeCache = new TtlCache<BrightDataScrapeResponse>();
  private warnedNoToken = false;

  constructor(private readonly http: HttpBrightDataClient | null) {}

  get isConfigured(): boolean {
    return this.http?.isConfigured ?? false;
  }

  async isProAvailable(): Promise<boolean> {
    return false;
  }

  private warnNoToken(): void {
    if (this.warnedNoToken) return;
    this.warnedNoToken = true;
    logger.warn("Bright Data token absent - serving seeded research fixtures", { service: "brightdata" });
  }

  async searchEngine(input: SearchEngineInput, ctx?: BrightDataRequestContext): Promise<BrightDataSearchResponse> {
    const key = `${input.engine ?? "google"}:${input.country ?? "us"}:${input.query}`;
    const cached = this.searchCache.get(key);
    if (cached) return cached;

    let response: BrightDataSearchResponse;
    if (!this.http) {
      this.warnNoToken();
      response = matchFixtureSearch(input);
    } else {
      try {
        response = await this.http.searchEngine(input, ctx);
        // An empty live result set is a soft failure; enrich with fixtures so the
        // demo never shows an empty workspace.
        if (response.results.length === 0) response = matchFixtureSearch(input);
      } catch (error) {
        logger.warn("Bright Data searchEngine failed - using fixtures", { query: input.query, error: String(error) });
        response = matchFixtureSearch(input);
      }
    }

    this.searchCache.set(key, response);
    return response;
  }

  async searchEngineBatch(queries: SearchEngineInput[], ctx?: BrightDataRequestContext): Promise<BrightDataSearchResponse[]> {
    return Promise.all(queries.map((q) => this.searchEngine(q, ctx)));
  }

  async scrapeAsMarkdown(url: string, ctx?: BrightDataRequestContext): Promise<BrightDataScrapeResponse> {
    const cached = this.scrapeCache.get(url);
    if (cached) return cached;

    let response: BrightDataScrapeResponse;
    if (!this.http) {
      this.warnNoToken();
      response = matchFixtureScrape(url);
    } else {
      try {
        response = await this.http.scrapeAsMarkdown(url, ctx);
        if (!response.markdown || response.markdown.trim().length === 0) response = matchFixtureScrape(url);
      } catch (error) {
        logger.warn("Bright Data scrapeAsMarkdown failed - using fixtures", { url, error: String(error) });
        response = matchFixtureScrape(url);
      }
    }

    this.scrapeCache.set(url, response);
    return response;
  }

  async scrapeBatch(urls: string[], ctx?: BrightDataRequestContext): Promise<BrightDataScrapeResponse[]> {
    return Promise.all(urls.map((url) => this.scrapeAsMarkdown(url, ctx)));
  }

  async webData(): Promise<unknown | null> {
    return null;
  }

  /** Test helper: drop cached responses. */
  clearCache(): void {
    this.searchCache.clear();
    this.scrapeCache.clear();
  }
}

let client: BrightDataClient | null = null;

export function getBrightDataClient(): BrightDataClient {
  if (!client) {
    const http = isBrightDataConfigured() ? new HttpBrightDataClient(getEnv().BRIGHTDATA_API_TOKEN) : null;
    client = new ResilientBrightDataClient(http);
  }
  return client;
}

/** Test/seeding hook to inject a concrete implementation. */
export function setBrightDataClient(custom: BrightDataClient): void {
  client = custom;
}

/** Test hook to reset the singleton (so env changes are re-read). */
export function resetBrightDataClient(): void {
  client = null;
}
