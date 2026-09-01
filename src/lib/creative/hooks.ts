import { HOOK_LABELS, HOOK_TYPES, type HookAnalysis, type HookType } from "./types";

/**
 * PURE psychological hook classification. Direct-response copy pulls one of six
 * persuasion levers; this scores the copy against weighted signal dictionaries
 * for each lever and returns the dominant mechanism with a confidence.
 *
 * It is deterministic and offline, so it works with zero credentials and is the
 * fallback whenever the optional AI classifier is unavailable or its output
 * fails validation. The AI path (see `studio.ts`) only ever *refines* this.
 */

export { HOOK_TYPES, HOOK_LABELS } from "./types";
export type { HookType, HookAnalysis } from "./types";

interface RawSignal {
  /** Pattern (word or phrase). Word patterns match on boundaries; phrases as substrings. */
  p: string;
  /** Weight - phrases are more diagnostic than single words. */
  w?: number;
}

const SIGNAL_DEFS: Record<HookType, RawSignal[]> = {
  fear: [
    { p: "warning", w: 1.4 },
    { p: "danger" },
    { p: "risk" },
    { p: "lose", w: 1.2 },
    { p: "losing", w: 1.2 },
    { p: "broke" },
    { p: "wipe out", w: 1.6 },
    { p: "destroy" },
    { p: "destroying", w: 1.4 },
    { p: "mistake" },
    { p: "crash" },
    { p: "crisis" },
    { p: "afraid" },
    { p: "scared" },
    { p: "threat" },
    { p: "avoid" },
    { p: "before it's too late", w: 1.8 },
    { p: "running out", w: 1.4 },
    { p: "could leave you", w: 1.6 },
    { p: "stop", w: 0.8 },
  ],
  curiosity: [
    { p: "secret", w: 1.4 },
    { p: "the truth", w: 1.5 },
    { p: "revealed" },
    { p: "reveals" },
    { p: "this one", w: 1.3 },
    { p: "trick" },
    { p: "weird" },
    { p: "surprising" },
    { p: "you won't believe", w: 1.8 },
    { p: "nobody tells you", w: 1.8 },
    { p: "what they don't", w: 1.8 },
    { p: "here's why", w: 1.4 },
    { p: "the real reason", w: 1.6 },
    { p: "discover" },
    { p: "hidden" },
    { p: "?", w: 0.8 },
    { p: "it's not what you think", w: 1.8 },
  ],
  fomo: [
    { p: "miss out", w: 1.7 },
    { p: "don't miss", w: 1.6 },
    { p: "missing out", w: 1.6 },
    { p: "everyone is", w: 1.4 },
    { p: "others are", w: 1.3 },
    { p: "while you can", w: 1.5 },
    { p: "before everyone", w: 1.6 },
    { p: "left behind", w: 1.6 },
    { p: "leaving money", w: 1.6 },
    { p: "quietly moving", w: 1.5 },
    { p: "trending" },
    { p: "join thousands", w: 1.5 },
  ],
  social_proof: [
    { p: "thousands", w: 1.3 },
    { p: "millions", w: 1.3 },
    { p: "trusted by", w: 1.6 },
    { p: "rated" },
    { p: "reviews" },
    { p: "customers" },
    { p: "members" },
    { p: "best-selling", w: 1.4 },
    { p: "as seen", w: 1.4 },
    { p: "experts agree", w: 1.6 },
    { p: "#1", w: 1.4 },
    { p: "1,000s", w: 1.4 },
    { p: "people are", w: 1.2 },
    { p: "join" },
  ],
  urgency: [
    { p: "now", w: 0.9 },
    { p: "today", w: 1.1 },
    { p: "hurry" },
    { p: "ends" },
    { p: "deadline" },
    { p: "last chance", w: 1.7 },
    { p: "limited time", w: 1.7 },
    { p: "act fast", w: 1.6 },
    { p: "act now", w: 1.6 },
    { p: "expires" },
    { p: "only today", w: 1.6 },
    { p: "24 hours", w: 1.4 },
    { p: "before midnight", w: 1.6 },
    { p: "final hours", w: 1.6 },
    { p: "immediately" },
  ],
  exclusivity: [
    { p: "exclusive", w: 1.5 },
    { p: "invite only", w: 1.7 },
    { p: "invitation", w: 1.4 },
    { p: "members only", w: 1.7 },
    { p: "private" },
    { p: "vip", w: 1.4 },
    { p: "insider", w: 1.4 },
    { p: "select few", w: 1.6 },
    { p: "limited spots", w: 1.6 },
    { p: "reserved" },
    { p: "by invitation", w: 1.7 },
    { p: "elite" },
    { p: "early access", w: 1.5 },
  ],
};

interface CompiledSignal {
  matcher: RegExp;
  weight: number;
}

/** Build a matcher: word boundaries for alphanumeric edges, raw otherwise (e.g. "#1", "?"). */
function buildMatcher(p: string): RegExp {
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pre = /^[a-z0-9]/i.test(p) ? "\\b" : "";
  const post = /[a-z0-9]$/i.test(p) ? "\\b" : "";
  return new RegExp(`${pre}${esc}${post}`, "gi");
}

// Compile once at module load (avoid rebuilding RegExps per classification).
const COMPILED: Record<HookType, CompiledSignal[]> = HOOK_TYPES.reduce(
  (acc, type) => {
    acc[type] = SIGNAL_DEFS[type].map((s) => ({
      matcher: buildMatcher(s.p),
      weight: s.w ?? (s.p.includes(" ") ? 1.5 : 1),
    }));
    return acc;
  },
  {} as Record<HookType, CompiledSignal[]>,
);

const round2 = (n: number): number => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function countMatches(hay: string, matcher: RegExp): number {
  const m = hay.match(matcher);
  return m ? m.length : 0;
}

/** Raw (un-normalized) weighted signal strength per hook mechanism. */
export function scoreHooks(text: string): Record<HookType, number> {
  const hay = text.toLowerCase();
  const out = {} as Record<HookType, number>;
  for (const type of HOOK_TYPES) {
    let s = 0;
    for (const sig of COMPILED[type]) {
      const n = countMatches(hay, sig.matcher);
      if (n > 0) s += Math.min(n, 2) * sig.weight; // cap repeats so spam can't dominate
    }
    out[type] = round2(s);
  }
  return out;
}

/**
 * Classifies the dominant persuasion mechanism in `text`. Confidence blends the
 * winner's share of total signal with its absolute strength, so a single weak
 * cue yields low confidence and multiple strong cues yield high confidence.
 */
export function classifyHookHeuristic(text: string): HookAnalysis {
  const raw = scoreHooks(text);
  const total = HOOK_TYPES.reduce((sum, t) => sum + raw[t], 0);

  const scores: Record<string, number> = {};
  for (const t of HOOK_TYPES) scores[t] = total > 0 ? round2(raw[t] / total) : 0;

  if (total === 0) {
    return {
      type: "curiosity",
      confidence: 0.25,
      rationale: "No strong persuasion signal detected; defaulting to curiosity.",
      scores,
    };
  }

  let type: HookType = HOOK_TYPES[0];
  for (const t of HOOK_TYPES) if (raw[t] > raw[type]) type = t;

  const share = raw[type] / total;
  const strength = Math.min(1, raw[type] / 5);
  const confidence = round2(clamp(0.35 + 0.4 * share + 0.25 * strength, 0, 0.98));

  return {
    type,
    confidence,
    rationale: `Leads with ${HOOK_LABELS[type].toLowerCase()} cues.`,
    scores,
  };
}

/** Coerces an arbitrary string to a valid `HookType` (for AI output), else null. */
export function coerceHookType(value: string): HookType | null {
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const alias: Record<string, HookType> = {
    fear: "fear",
    curiosity: "curiosity",
    fomo: "fomo",
    fear_of_missing_out: "fomo",
    social_proof: "social_proof",
    socialproof: "social_proof",
    authority: "social_proof",
    urgency: "urgency",
    scarcity: "urgency",
    exclusivity: "exclusivity",
    exclusive: "exclusivity",
  };
  const mapped = alias[v];
  if (mapped) return mapped;
  return (HOOK_TYPES as readonly string[]).includes(v) ? (v as HookType) : null;
}
