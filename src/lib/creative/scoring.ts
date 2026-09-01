import type { AdPlatform } from "@/lib/research/standard-models";

import { getPlatformSpec } from "./platforms";
import type { CreativeField, HookAnalysis, ScoreAnalysis, ScoreBreakdown } from "./types";

/**
 * PURE creative scoring against direct-response best practices. Four sub-scores
 * (clarity, specificity, CTA strength, hook strength) roll up to a 0-100 total.
 * Deterministic and offline so it always runs; an optional AI pass may refine it
 * later, but the heuristic is the trustworthy floor.
 */

const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  hookStrength: 0.3,
  clarity: 0.25,
  specificity: 0.25,
  ctaStrength: 0.2,
};

const CTA_VERBS = [
  "get",
  "download",
  "start",
  "try",
  "claim",
  "join",
  "discover",
  "learn",
  "see",
  "sign up",
  "subscribe",
  "shop",
  "book",
  "register",
  "grab",
  "unlock",
  "find out",
  "watch",
  "read",
  "request",
  "save",
  "explore",
  "act",
];

const clamp = (n: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, n));
const round = (n: number): number => Math.round(n);

function allText(fields: CreativeField[]): string {
  return fields
    .map((f) => f.text)
    .filter((t) => t.trim().length > 0)
    .join(" ");
}

/** Clarity: fits limits, isn't truncated, avoids shouting and over-punctuation. */
function scoreClarity(fields: CreativeField[]): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;

  if (fields.some((f) => !f.withinLimit)) {
    score -= 30;
    notes.push("Trim copy that exceeds the platform character limit.");
  }
  if (fields.some((f) => f.truncated)) {
    score -= 12;
    notes.push("Some fields were auto-trimmed - tighten them so nothing is lost.");
  }

  const text = allText(fields);
  const letters = text.replace(/[^a-z]/gi, "");
  const caps = text.replace(/[^A-Z]/g, "");
  if (letters.length > 12 && caps.length / letters.length > 0.4) {
    score -= 12;
    notes.push("Reduce ALL-CAPS - it reads as shouting and hurts deliverability.");
  }

  const exclaims = (text.match(/!/g) ?? []).length;
  if (exclaims > 2) {
    score -= 8;
    notes.push("Cut excessive exclamation marks.");
  }

  // A primary headline that's extremely short rarely carries a full idea.
  const head = fields.find((f) => f.role === "headline" || f.role === "hook");
  if (head && head.text.trim().length > 0 && head.text.trim().length < 8) {
    score -= 8;
    notes.push("The headline is very short - say more in it.");
  }

  return { score: clamp(score), notes };
}

/** Specificity: concrete numbers, money, percentages, time, and proper nouns. */
function scoreSpecificity(fields: CreativeField[]): { score: number; notes: string[] } {
  const text = allText(fields);
  if (text.trim().length === 0) return { score: 0, notes: ["No copy to evaluate."] };

  let signals = 0;
  signals += (text.match(/\d/g) ?? []).length > 0 ? 1 : 0;
  signals += /[$£€]\s?\d|\d+\s?(?:%|percent)/i.test(text) ? 2 : 0;
  signals += /\b(?:20\d{2}|day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes)\b/i.test(text) ? 1 : 0;
  signals += /\b\d[\d,]*(?:k|m|\+)\b/i.test(text) ? 1 : 0;
  // Proper-noun-ish capitalized words (excluding sentence starts) hint at concreteness.
  const properNouns = (text.match(/(?<!^)(?<![.!?]\s)\b[A-Z][a-z]{2,}\b/g) ?? []).length;
  signals += properNouns >= 2 ? 1 : 0;

  const score = clamp(35 + signals * 16);
  const notes = signals === 0 ? ["Add a concrete number, figure, or named proof point."] : [];
  return { score, notes };
}

/** CTA strength: presence of an action verb, ideally in a dedicated CTA field. */
function scoreCta(platform: AdPlatform, fields: CreativeField[]): { score: number; notes: string[] } {
  const spec = getPlatformSpec(platform);
  const hasCtaRole = spec.roles.some((r) => r.role === "cta");
  const ctaField = fields.find((f) => f.role === "cta");
  const text = allText(fields).toLowerCase();

  const verbHit = CTA_VERBS.some((v) => new RegExp(`\\b${v.replace(/ /g, "\\s")}\\b`, "i").test(text));

  let score = 40;
  if (verbHit) score += 35;
  if (ctaField && ctaField.text.trim().length > 0) score += 20;

  const notes: string[] = [];
  if (!verbHit) notes.push("Add a clear action verb (Get, Download, Claim, Start).");
  if (hasCtaRole && !(ctaField && ctaField.text.trim().length > 0)) notes.push("Fill the CTA field with a direct action.");

  return { score: clamp(score), notes };
}

/** Hook strength: confidence of the classified mechanism, scaled to 0-100. */
function scoreHookStrength(hook: HookAnalysis): { score: number; notes: string[] } {
  const score = clamp(round(hook.confidence * 100));
  const notes = score < 45 ? ["The opening hook is weak - lead with a sharper psychological angle."] : [];
  return { score, notes };
}

/**
 * Scores a variant from its enforced fields + classified hook. Returns the
 * weighted total, the sub-score breakdown, and prioritized improvement notes.
 */
export function scoreVariant(platform: AdPlatform, fields: CreativeField[], hook: HookAnalysis): ScoreAnalysis {
  const clarity = scoreClarity(fields);
  const specificity = scoreSpecificity(fields);
  const cta = scoreCta(platform, fields);
  const hookStrength = scoreHookStrength(hook);

  const breakdown: ScoreBreakdown = {
    clarity: round(clarity.score),
    specificity: round(specificity.score),
    ctaStrength: round(cta.score),
    hookStrength: round(hookStrength.score),
  };

  const total = round(
    breakdown.clarity * WEIGHTS.clarity +
      breakdown.specificity * WEIGHTS.specificity +
      breakdown.ctaStrength * WEIGHTS.ctaStrength +
      breakdown.hookStrength * WEIGHTS.hookStrength,
  );

  const notes = [...hookStrength.notes, ...clarity.notes, ...specificity.notes, ...cta.notes].slice(0, 4);

  return { total: clamp(total), breakdown, notes };
}

/** Letter grade for a 0-100 score, for compact display. */
export function scoreGrade(total: number): "A" | "B" | "C" | "D" {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  return "D";
}
