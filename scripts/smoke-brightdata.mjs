/**
 * LIVE smoke test for the Bright Data SERP + Web Unlocker integration.
 *
 * Creds-gated and intentionally NOT part of the Vitest suite or CI: it makes
 * real network calls using the secrets in the git-ignored `.env.local`. It
 * mirrors EXACTLY how `src/lib/research/brightdata.ts` builds its requests and
 * parses the response, so a green run proves the production wiring works end to
 * end and surfaces any drift between the live API shape and our parser:
 *   (a) searchEngine  - POST /request { zone: <serp>, url: <google ...&brd_json=1>, format: "raw" }
 *                       -> parse SERP JSON (organic / related / people_also_ask)
 *   (b) scrapeAsMarkdown - POST /request { zone: <unlocker>, url, format: "raw", data_format: "markdown" }
 *
 * Run:  npm run smoke:brightdata
 * Prints real organic results + a markdown preview. Exits non-zero on failure.
 * Never commit its output (scraped data) or the secrets it reads.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Load secrets from .env.local (same file the app reads). Node >= 20.6.
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch (error) {
  console.error("Could not load .env.local:", error?.message ?? error);
  process.exit(1);
}

const BRIGHTDATA_REQUEST_URL = "https://api.brightdata.com/request";

const token = (process.env.BRIGHTDATA_API_TOKEN ?? "").trim();
const unlockerZone = (process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE ?? "mcp_unlocker").trim() || "mcp_unlocker";
const serpZone = (process.env.BRIGHTDATA_SERP_ZONE ?? "").trim() || unlockerZone;

if (!token) {
  console.error("Missing BRIGHTDATA_API_TOKEN in .env.local");
  process.exit(1);
}

const mask = (s) => (s.length <= 8 ? "****" : `${s.slice(0, 4)}...${s.slice(-4)}`);
console.log("=== Bright Data SERP + Web Unlocker live smoke ===");
console.log("request URL  :", BRIGHTDATA_REQUEST_URL);
console.log("serp zone    :", serpZone);
console.log("unlocker zone:", unlockerZone);
console.log("api token    :", mask(token));
console.log("");

/* ---- mirror of brightdata.ts buildSerpUrl (google) ---------------------- */
function buildSerpUrl({ query, engine = "google", country = "us", count = 15 }) {
  const q = encodeURIComponent(query);
  switch (engine) {
    case "bing":
      return `https://www.bing.com/search?q=${q}&brd_json=1&cc=${encodeURIComponent(country)}&count=${count}`;
    case "yandex":
      return `https://yandex.com/search/?text=${q}&brd_json=1`;
    case "google":
    default:
      return `https://www.google.com/search?q=${q}&brd_json=1&gl=${encodeURIComponent(country)}&num=${count}`;
  }
}

/* ---- mirror of brightdata.ts parseSerpJson ----------------------------- */
function parseSerpJson(text, input) {
  const engine = input.engine ?? "google";
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Bright Data SERP returned non-JSON body");
  }
  const root = json ?? {};
  const organicRaw = Array.isArray(root.organic) ? root.organic : [];
  const results = organicRaw
    .map((item, i) => ({
      title: item.title,
      url: item.link ?? item.url ?? "",
      snippet: item.description ?? item.snippet,
      position: item.rank ?? item.position ?? i + 1,
    }))
    .filter((r) => r.url.length > 0);

  const relatedRaw = root.related ?? root.related_searches ?? root.relatedSearches;
  const relatedSearches = Array.isArray(relatedRaw)
    ? relatedRaw.map((r) => (typeof r === "string" ? r : (r?.query ?? r?.text))).filter((r) => typeof r === "string")
    : undefined;

  const paaRaw = root.people_also_ask ?? root.peopleAlsoAsk ?? root.related_questions;
  const peopleAlsoAsk = [];
  if (Array.isArray(paaRaw)) {
    for (const r of paaRaw) {
      const obj = r ?? {};
      const question = typeof obj.question === "string" ? obj.question : typeof r === "string" ? r : undefined;
      if (!question) continue;
      peopleAlsoAsk.push({ question, answer: typeof obj.answer === "string" ? obj.answer : undefined });
    }
  }
  return { query: input.query, engine, results, relatedSearches, peopleAlsoAsk, raw: json };
}

async function brightDataRequest(payload) {
  const t0 = Date.now();
  const response = await fetch(BRIGHTDATA_REQUEST_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const ms = Date.now() - t0;
  const text = await response.text();
  return { status: response.status, ok: response.ok, ms, text, contentType: response.headers.get("content-type") ?? "" };
}

let failures = 0;

/* ----------------------------- (a) SERP --------------------------------- */
async function smokeSerp() {
  console.log("--- (a) searchEngine: google 'retirement income newsletter' (geo us) ---");
  const input = { query: "retirement income newsletter", engine: "google", country: "us", count: 15 };
  const url = buildSerpUrl(input);
  console.log("serp url:", url);
  const { status, ok, ms, text, contentType } = await brightDataRequest({ zone: serpZone, url, format: "raw" });
  console.log(`HTTP ${status} (${ms}ms), content-type: ${contentType}, body length: ${text.length}`);
  if (!ok) {
    throw new Error(`SERP request failed: HTTP ${status}: ${text.slice(0, 300)}`);
  }

  // Discover the true shape: is brd_json=1 returning JSON, and what keys?
  let json;
  try {
    json = JSON.parse(text);
    console.log("brd_json=1 -> PARSED JSON. top-level keys:", Object.keys(json).slice(0, 25).join(", "));
  } catch {
    console.log("brd_json=1 -> NON-JSON body (likely raw HTML). first 200 chars:");
    console.log(text.slice(0, 200));
    throw new Error("brd_json=1 did not return JSON - brightdata.ts parsing must be revisited");
  }

  const parsed = parseSerpJson(text, input);
  console.log("organic results parsed:", parsed.results.length);
  console.log("related searches      :", parsed.relatedSearches?.length ?? 0);
  console.log("people-also-ask       :", parsed.peopleAlsoAsk?.length ?? 0);
  if (parsed.results[0]) {
    console.log("first result:", JSON.stringify(parsed.results[0], null, 2));
  }
  if (parsed.results.length === 0) {
    throw new Error("SERP returned 0 organic results - parser keys may not match live shape");
  }
  console.log("SERP OK\n");
}

/* --------------------------- (b) Web Unlocker --------------------------- */
async function smokeUnlocker() {
  console.log("--- (b) scrapeAsMarkdown: https://example.com (markdown) ---");
  const targetUrl = "https://example.com/";
  const { status, ok, ms, text, contentType } = await brightDataRequest({
    zone: unlockerZone,
    url: targetUrl,
    format: "raw",
    data_format: "markdown",
  });
  console.log(`HTTP ${status} (${ms}ms), content-type: ${contentType}, body length: ${text.length}`);
  if (!ok) {
    throw new Error(`Unlocker request failed: HTTP ${status}: ${text.slice(0, 300)}`);
  }
  if (!text || text.trim().length === 0) {
    throw new Error("Unlocker returned empty markdown");
  }
  console.log("markdown preview (first 200 chars):");
  console.log(text.slice(0, 200));
  console.log("\nUnlocker OK\n");
}

for (const [label, fn] of [
  ["serp", smokeSerp],
  ["unlocker", smokeUnlocker],
]) {
  try {
    await fn();
  } catch (error) {
    failures += 1;
    console.error(`${label} FAILED:`, error?.message ?? error);
  }
}

console.log(failures === 0 ? "=== ALL SMOKE CHECKS PASSED ===" : `=== ${failures} SMOKE CHECK(S) FAILED ===`);
process.exit(failures === 0 ? 0 : 1);
