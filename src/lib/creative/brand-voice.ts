import { z } from "zod";

import { scoreHooks } from "./hooks";
import { HOOK_LABELS, HOOK_TYPES, hookTypeSchema, type HookType } from "./types";

/**
 * PURE brand-voice analysis. Given a handful of winning ads, derive a structured
 * tone profile (formality, cadence, emoji use, dominant hooks, signature
 * vocabulary). The profile is persisted to `brand_voices.tone_profile` and
 * summarized into generation prompts so new copy sounds like the brand.
 *
 * Deterministic + offline (an optional AI pass in `studio.ts` may enrich it).
 */

export const formalitySchema = z.enum(["casual", "conversational", "professional", "formal"]);
export const readingLevelSchema = z.enum(["simple", "moderate", "advanced"]);
export const emojiUsageSchema = z.enum(["none", "light", "heavy"]);

export const toneProfileSchema = z.object({
  formality: formalitySchema,
  readingLevel: readingLevelSchema,
  emojiUsage: emojiUsageSchema,
  /** Average words per sentence across the samples. */
  avgSentenceLength: z.number().nonnegative(),
  /** Top persuasion mechanisms the brand favors. */
  dominantHooks: z.array(hookTypeSchema).default([]),
  /** Signature words/phrases that recur across the samples. */
  vocabulary: z.array(z.string()).default([]),
  /** Human-readable tone descriptors (e.g. "urgent", "trustworthy"). */
  descriptors: z.array(z.string()).default([]),
  exclamationRate: z.number().nonnegative().default(0),
  sampleCount: z.number().int().nonnegative().default(0),
});
export type ToneProfile = z.infer<typeof toneProfileSchema>;

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "with", "that", "this", "are", "but", "not", "all", "can", "our", "out", "get",
  "has", "have", "will", "from", "they", "their", "what", "when", "how", "why", "who", "was", "were", "into", "over",
  "more", "most", "than", "then", "them", "these", "those", "just", "now", "new", "one", "two", "its", "it's", "about",
  "before", "after", "here", "there", "without", "every", "some", "any", "been", "being", "which",
]);

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];
}

function countEmoji(text: string): number {
  return (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu) ?? []).length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Derives a structured tone profile from sample ad copy. Pure + deterministic. */
export function deriveToneProfile(samples: string[]): ToneProfile {
  const cleaned = samples.map((s) => s.trim()).filter((s) => s.length > 0);
  if (cleaned.length === 0) {
    return toneProfileSchema.parse({
      formality: "conversational",
      readingLevel: "moderate",
      emojiUsage: "none",
      avgSentenceLength: 0,
      sampleCount: 0,
    });
  }

  const joined = cleaned.join("\n");
  const sentences = cleaned.flatMap(splitSentences);
  const tokens = tokenize(joined);
  const wordCount = tokens.length;

  const avgSentenceLength = sentences.length > 0 ? round1(wordCount / sentences.length) : wordCount;
  const avgWordLength = wordCount > 0 ? tokens.reduce((sum, t) => sum + t.length, 0) / wordCount : 0;

  const contractions = (joined.match(/\b\w+'\w+\b/g) ?? []).length;
  const youCount = (joined.toLowerCase().match(/\byou\b|\byour\b/g) ?? []).length;
  const exclamations = (joined.match(/!/g) ?? []).length;
  const exclamationRate = cleaned.length > 0 ? round1(exclamations / cleaned.length) : 0;

  // Formality: contractions + direct address pull casual; long, dense sentences pull formal.
  let formalityScore = 0;
  formalityScore += contractions > cleaned.length ? -2 : contractions > 0 ? -1 : 1;
  formalityScore += youCount > cleaned.length ? -1 : 0;
  formalityScore += exclamationRate > 1 ? -1 : 0;
  formalityScore += avgSentenceLength > 18 ? 2 : avgSentenceLength > 12 ? 1 : 0;
  formalityScore += avgWordLength > 5.2 ? 1 : 0;
  const formality: ToneProfile["formality"] =
    formalityScore <= -2 ? "casual" : formalityScore <= 0 ? "conversational" : formalityScore === 1 ? "professional" : "formal";

  const readingLevel: ToneProfile["readingLevel"] =
    avgWordLength > 5.3 || avgSentenceLength > 20 ? "advanced" : avgWordLength > 4.4 || avgSentenceLength > 12 ? "moderate" : "simple";

  const emojiCount = countEmoji(joined);
  const emojiUsage: ToneProfile["emojiUsage"] =
    emojiCount === 0 ? "none" : emojiCount >= cleaned.length ? "heavy" : "light";

  // Dominant hooks: aggregate per-sample heuristic scores.
  const hookTotals = {} as Record<HookType, number>;
  for (const t of HOOK_TYPES) hookTotals[t] = 0;
  for (const sample of cleaned) {
    const scores = scoreHooks(sample);
    for (const t of HOOK_TYPES) hookTotals[t] += scores[t];
  }
  const dominantHooks = [...HOOK_TYPES]
    .filter((t) => hookTotals[t] > 0)
    .sort((a, b) => hookTotals[b] - hookTotals[a])
    .slice(0, 3);

  // Signature vocabulary: frequent, distinctive, non-stopword tokens.
  const freq = new Map<string, number>();
  for (const tok of tokens) {
    if (tok.length < 4 || STOPWORDS.has(tok)) continue;
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }
  const vocabulary = [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);

  const descriptors: string[] = [];
  descriptors.push(formality);
  if (exclamationRate >= 1) descriptors.push("energetic");
  if (dominantHooks[0]) descriptors.push(hookDescriptor(dominantHooks[0]));
  if (/\d/.test(joined)) descriptors.push("specific");
  if (readingLevel === "simple") descriptors.push("plain-spoken");

  return toneProfileSchema.parse({
    formality,
    readingLevel,
    emojiUsage,
    avgSentenceLength,
    dominantHooks,
    vocabulary,
    descriptors: [...new Set(descriptors)],
    exclamationRate,
    sampleCount: cleaned.length,
  });
}

function hookDescriptor(hook: HookType): string {
  const map: Record<HookType, string> = {
    fear: "cautionary",
    curiosity: "intriguing",
    fomo: "punchy",
    social_proof: "credible",
    urgency: "urgent",
    exclusivity: "premium",
  };
  return map[hook];
}

/** Compact, prompt-ready summary of a tone profile to bias generation. */
export function summarizeToneForPrompt(profile: ToneProfile): string {
  if (profile.sampleCount === 0) return "";
  const parts = [
    `Tone: ${profile.descriptors.join(", ") || profile.formality}.`,
    `Formality: ${profile.formality}; reading level: ${profile.readingLevel}.`,
    `Average sentence length ~${profile.avgSentenceLength} words.`,
    profile.emojiUsage !== "none" ? `Emoji usage: ${profile.emojiUsage}.` : "Avoid emoji.",
    profile.dominantHooks.length
      ? `Favor ${profile.dominantHooks.map((h) => HOOK_LABELS[h].toLowerCase()).join(" / ")} hooks.`
      : "",
    profile.vocabulary.length ? `Echo signature vocabulary where natural: ${profile.vocabulary.slice(0, 8).join(", ")}.` : "",
  ];
  return parts.filter((p) => p.length > 0).join(" ");
}
