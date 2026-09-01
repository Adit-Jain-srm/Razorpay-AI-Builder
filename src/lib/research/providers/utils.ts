/**
 * Shared, pure helpers for provider `transformData`. Kept deterministic and
 * side-effect free so they unit-test trivially and behave identically on live
 * Bright Data output and on seeded fixtures.
 */

import type { SourceCitation } from "../standard-models";

export function nowIso(): string {
  return new Date().toISOString();
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Maps a URL to a MediaOS source platform label. */
export function inferPlatformFromUrl(url: string | undefined): string {
  if (!url) return "web";
  const u = url.toLowerCase();
  if (u.includes("facebook.com") || u.includes("instagram.com") || u.includes("/ads/library")) return "meta";
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("x.com") || u.includes("twitter.com")) return "x";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("taboola.com") || u.includes("outbrain.com")) return "taboola";
  if (u.includes("quora.com")) return "quora";
  if (/cnbc|bloomberg|marketwatch|wsj|reuters|forbes|cnn|nytimes|barrons/.test(u)) return "news";
  if (u.includes("google.com")) return "google";
  return "web";
}

/** Direct-response creative type inferred from where the ad/link lives. */
export function inferCreativeType(url: string | undefined): string {
  if (!url) return "unknown";
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("tiktok.com")) return "video";
  if (u.includes("taboola.com") || u.includes("outbrain.com")) return "native";
  if (u.includes("google.com/search")) return "search";
  if (u.includes("/ads/library") || u.includes("facebook.com")) return "image";
  return "web";
}

/** Lexicon-based direct-response hook classification (deterministic). */
const HOOK_LEXICON: Record<string, string[]> = {
  fear: ["terrified", "destroy", "broke", "warning", "danger", "lose", "running out", "scam", "crash", "threat", "risk", "wiped"],
  urgency: ["now", "before", "today", "deadline", "last chance", "act ", "limited", "expires", "2026", "don't wait"],
  curiosity: ["secret", "not what you think", "revealed", "this one", "weird", "surprising", "hidden", "what they don't"],
  fomo: ["thousands are", "everyone", "quietly moving", "don't miss", "others are", "join thousands"],
  authority: ["analyst", "insider", "expert", "wall street", "former", "fund manager", "advisor", "official"],
  social_proof: ["readers", "members", "subscribers", "join 2", "reviews", "thousands of", "250,000", "trusted by"],
  greed: ["$", "%", "income", "profit", "returns", "yield", "pays", "wealth", "rich", "double", "8%"],
  specificity: ["step-by-step", "blueprint", "3-fund", "exact", "checklist", "/month", "per month"],
  trust: ["plain-english", "plain english", "no hype", "transparent", "honest", "no upsell", "fiduciary", "you can trust"],
  contrarian: ["forget", "instead", "is dead", "myth", "stop ", "could leave you", "don't ", "rule could"],
};

export function classifyHooks(text: string | undefined, limit = 4): string[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const matched: string[] = [];
  for (const [hook, terms] of Object.entries(HOOK_LEXICON)) {
    if (terms.some((term) => t.includes(term))) matched.push(hook);
  }
  return matched.slice(0, limit);
}

/** Rough lexicon sentiment in [-1, 1]; enough to color trends/community insights. */
const POSITIVE = ["best", "safe", "protect", "confident", "grow", "simple", "trust", "win", "gain", "calm", "secure", "opportunity"];
const NEGATIVE = ["terrified", "scam", "broke", "fear", "hit", "behind", "anxiety", "anxious", "risk", "destroy", "worried", "squeeze", "crash", "lose", "struggle"];

export function roughSentiment(text: string | undefined): number {
  if (!text) return 0;
  const t = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (t.includes(w)) score += 1;
  for (const w of NEGATIVE) if (t.includes(w)) score -= 1;
  if (score === 0) return 0;
  return Math.max(-1, Math.min(1, score / 4));
}

/** First sentence (or a trimmed prefix) - used to summarize a quote into a pain point. */
export function firstSentence(text: string, maxLen = 120): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  const sentence = (match ? match[0] : trimmed).trim();
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1).trimEnd()}…` : sentence;
}

/**
 * Turns a community quote into a concise, neutral pain-point summary by stripping
 * first-person framing and clipping to one clause. Deterministic for tests.
 */
export function summarizePain(text: string): string {
  const cleaned = text
    .replace(/^(i'm|i am|i|honestly|my|we|we're|we are)\b/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return firstSentence(cleaned, 100);
}

/** Geometric-ish volume estimate from SERP rank so trends sort sensibly. */
export function estimateVolumeFromRank(rank: number, base = 60000): number {
  const r = Math.max(1, rank);
  return Math.round(base / r);
}

/** Velocity heuristic: higher ranks (lower number) imply more momentum. */
export function estimateVelocityFromRank(rank: number): number {
  const r = Math.max(1, rank);
  return clamp01(0.5 / r + 0.05);
}

export function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Builds a citation from a SERP/scrape hit with a provider tag. */
export function toCitation(
  provider: string,
  partial: { url?: string; title?: string; snippet?: string; confidence?: number },
): SourceCitation {
  return {
    provider,
    url: partial.url,
    title: partial.title,
    snippet: partial.snippet,
    confidence: partial.confidence,
    fetchedAt: nowIso(),
  };
}

/** Returns the first markdown heading text at the given level (1 = `#`, 2 = `##`). */
export function extractMarkdownHeading(markdown: string | undefined, level: number): string | undefined {
  if (!markdown) return undefined;
  const prefix = "#".repeat(level);
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(new RegExp(`^${prefix}\\s+(.*)$`));
    if (m && !line.startsWith(`${prefix}#`)) return m[1].trim();
  }
  return undefined;
}

/** Returns the first non-empty, non-heading, non-bullet paragraph from markdown. */
export function firstParagraph(markdown: string | undefined): string | undefined {
  if (!markdown) return undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || /^[-*]\s/.test(trimmed)) continue;
    return trimmed;
  }
  return undefined;
}

/** Extracts markdown bullet lines (and their inline upvote counts when present). */
export function extractMarkdownBullets(markdown: string | undefined): { text: string; upvotes?: number }[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const bullets: { text: string; upvotes?: number }[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (!m) continue;
    let text = m[1].trim();
    let upvotes: number | undefined;
    const up = text.match(/\((\d[\d,]*)\s*(?:upvotes?|likes?|points?)\)/i);
    if (up) {
      upvotes = Number(up[1].replace(/,/g, ""));
      text = text.replace(up[0], "").trim();
    }
    // Strip surrounding quotes.
    text = text.replace(/^["“]|["”]$/g, "").trim();
    if (text.length > 0) bullets.push({ text, upvotes });
  }
  return bullets;
}
