import type { Browser, Page } from "puppeteer-core";

import { TimeoutError, toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { extractMarkdownHeading } from "./providers/utils";

/**
 * Bright Data Scraping Browser adapter - the JS-heavy escape hatch for the
 * research providers.
 *
 * Some sources (Meta Ad Library, infinite-scroll social feeds) render their
 * content with client-side JavaScript, so a plain HTTP fetch / Web Unlocker
 * markdown pull returns an empty shell. For those we drive a **remote** Chromium
 * over Bright Data's Scraping Browser via a WebSocket endpoint
 * (`BRIGHTDATA_BROWSER_WS`). It is a pure WS client - there is NO local Chromium
 * download - so it runs unchanged on Vercel serverless (Node runtime).
 *
 * Resilience is non-negotiable and mirrors the rest of the engine:
 * - `withScrapingBrowser` returns `null` (never throws) when the endpoint is
 *   unset or any connect/navigation/extraction step fails, so callers degrade to
 *   the Web Unlocker -> seeded-fixture chain.
 * - Every attempt is bounded by a timeout, retried a bounded number of times,
 *   and the browser connection is ALWAYS disconnected in a `finally` (including
 *   the race where `connect` resolves after we have already timed out) so we
 *   never leak a remote browser session.
 *
 * `puppeteer-core` is imported dynamically so it is only loaded at runtime when a
 * browser endpoint is configured (keeping it out of the client bundle and lazy
 * on the server). The type-only import above is erased at compile time.
 *
 * Server-only: import this exclusively from server modules (research providers,
 * server actions, route handlers running on the Node runtime) - never from a
 * client component. We avoid the `server-only` package guard so the offline
 * Vitest suite can exercise the pure parsers + fallback chain.
 */

export interface ScrapingBrowserOptions {
  /** Per-attempt budget (connect + navigation + extraction). Default 45s. */
  timeoutMs?: number;
  /** Retries after the first attempt. Default 1 (2 attempts total). */
  retries?: number;
  /** External abort signal; aborting skips further retries. */
  signal?: AbortSignal;
}

/** A single ad card distilled from the Meta Ad Library (browser or markdown). */
export interface ScrapedAdCard {
  advertiser?: string;
  copy: string;
  url?: string;
}

const DEFAULT_TIMEOUT_MS = 45_000;

/** Reads the Scraping Browser WSS endpoint at call time (server-only). */
function browserEndpoint(): string {
  return (process.env.BRIGHTDATA_BROWSER_WS ?? "").trim();
}

/** Whether a Scraping Browser endpoint is configured. */
export function isScrapingBrowserConfigured(): boolean {
  return browserEndpoint().length > 0;
}

/** Races a promise against a deadline, clearing the timer when it settles. */
function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

/** Connects to the remote browser with a bounded deadline + leak guard. */
async function connectWithTimeout(endpoint: string, timeoutMs: number): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");
  const browserPromise = puppeteer.connect({ browserWSEndpoint: endpoint, protocolTimeout: timeoutMs });
  try {
    return await withDeadline(browserPromise, timeoutMs, "scraping-browser.connect");
  } catch (error) {
    // If `connect` resolves AFTER we have given up, disconnect so we never leak.
    void browserPromise.then((b) => b.disconnect().catch(() => {})).catch(() => {});
    throw error;
  }
}

/** One full attempt: connect -> page -> fn -> always close + disconnect. */
async function runOnce<T>(endpoint: string, fn: (page: Page) => Promise<T>, timeoutMs: number): Promise<T> {
  const browser = await connectWithTimeout(endpoint, timeoutMs);
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(timeoutMs);
    page.setDefaultTimeout(timeoutMs);
    try {
      return await withDeadline(fn(page), timeoutMs, "scraping-browser.run");
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await browser.disconnect().catch(() => {});
  }
}

/**
 * Runs `fn` against a page on the remote Scraping Browser. Returns `fn`'s result,
 * or `null` when the browser is unconfigured or every attempt fails - callers
 * then fall back to the Web Unlocker / fixtures. Never throws and never leaks a
 * connection.
 */
export async function withScrapingBrowser<T>(
  fn: (page: Page) => Promise<T>,
  options: ScrapingBrowserOptions = {},
): Promise<T | null> {
  const endpoint = browserEndpoint();
  if (!endpoint) return null;

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? 1;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options.signal?.aborted) break;
    try {
      return await runOnce(endpoint, fn, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < retries && !options.signal?.aborted) {
        const delay = 500 * (attempt + 1);
        logger.warn("Scraping Browser attempt failed - retrying", {
          attempt: attempt + 1,
          delayMs: delay,
          error: toErrorMessage(error),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  logger.warn("Scraping Browser unavailable - caller will fall back", { error: toErrorMessage(lastError) });
  return null;
}

/* -------------------------------------------------------------------------- */
/* Meta Ad Library (JS-heavy) extraction                                      */
/* -------------------------------------------------------------------------- */

/** Builds a Meta Ad Library keyword-search URL for a query + 2-letter country. */
export function metaAdLibraryUrl(query: string, country: string): string {
  const cc = (country || "us").toUpperCase();
  const q = encodeURIComponent(query);
  return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${cc}&q=${q}&search_type=keyword_unordered&media_type=all`;
}

/**
 * Pure parser: distills the normalized inner-text of Meta Ad Library cards
 * (each card contains a "Library ID" administrative label) into ad signals.
 * Deterministic + unit-testable; the messy DOM scraping lives in the page
 * callback, the interpretation lives here.
 */
export function parseMetaAdCards(rawTexts: string[]): ScrapedAdCard[] {
  const cards: ScrapedAdCard[] = [];
  const seen = new Set<string>();
  for (const raw of rawTexts) {
    const text = (raw ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    // Advertiser often precedes a "Sponsored" label on the card.
    let advertiser: string | undefined;
    const m = text.match(/([A-Z][A-Za-z0-9&.,'’\-]{1,38}(?:\s+[A-Z][A-Za-z0-9&.,'’\-]{1,38}){0,4})\s+Sponsored\b/);
    if (m) advertiser = m[1].trim();

    // Drop the administrative tail + the "Sponsored" chrome to isolate the copy.
    const copy = text
      .replace(/Library ID:.*$/i, "")
      .replace(/\bSponsored\b/g, " ")
      .replace(/\bActive\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (copy.length < 8) continue;

    const key = copy.slice(0, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    cards.push(advertiser ? { advertiser, copy: copy.slice(0, 400) } : { copy: copy.slice(0, 400) });
    if (cards.length >= 20) break;
  }
  return cards;
}

/**
 * Pure parser for the Web Unlocker fallback: turns a markdown dump of the ad
 * library page (or the seeded ad-library fixture) into ad signals.
 */
export function parseAdCardsFromMarkdown(markdown: string | undefined): ScrapedAdCard[] {
  if (!markdown) return [];
  const advertiser = extractMarkdownHeading(markdown, 1)
    ?.replace(/\s*[-\u2013\u2014]\s*active ads.*$/i, "")
    .trim();

  const copies: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const t = line
      .replace(/\*\*/g, "")
      .replace(/^\s*(headline|body|copy|text)\s*:\s*/i, "")
      .trim();
    if (!t || t.startsWith("#")) continue;
    if (/active since|estimated reach|library id|learn more/i.test(t)) continue;
    if (t.length < 12) continue;
    copies.push(t);
    if (copies.length >= 6) break;
  }
  if (copies.length === 0) return [];

  const copy = copies.join(" ").replace(/\s+/g, " ").trim().slice(0, 400);
  return [advertiser ? { advertiser, copy } : { copy }];
}

/**
 * Fetches active ad cards for a query from the Meta Ad Library using the remote
 * Scraping Browser. Returns `null` when the browser is unavailable or yields
 * nothing (so the provider falls back to the Web Unlocker), never throwing.
 */
export async function fetchMetaAdLibraryCards(
  query: string,
  country: string,
  options: ScrapingBrowserOptions = {},
): Promise<ScrapedAdCard[] | null> {
  const url = metaAdLibraryUrl(query, country);
  const result = await withScrapingBrowser<ScrapedAdCard[]>(async (page) => {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    // Bounded best-effort wait for the JS-rendered cards; don't fail if absent.
    await page.waitForSelector("a[href*='/ads/library/']", { timeout: 8_000 }).catch(() => {});
    const rawTexts = await page.evaluate(() => {
      const out: string[] = [];
      const seen = new Set<string>();
      const divs = Array.from(document.querySelectorAll("div"));
      for (const el of divs) {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (!text || !/Library ID/i.test(text)) continue;
        // Skip the page-level containers; keep card-sized chunks.
        if (text.length > 1500) continue;
        const norm = text.slice(0, 700);
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push(norm);
        if (out.length >= 25) break;
      }
      return out;
    });
    // Attach the ad-library search URL so each card carries a real citation.
    return parseMetaAdCards(rawTexts).map((card) => ({ ...card, url }));
  }, options);

  if (!result || result.length === 0) return null;
  return result;
}
