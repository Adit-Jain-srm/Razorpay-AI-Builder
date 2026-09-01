import type { AdPlatform } from "@/lib/research/standard-models";

import { getPlatformSpec, type PlatformSpec } from "./platforms";

/**
 * PURE prompt construction for copy generation. Builds a strict, platform-aware
 * system prompt (hard character limits, hook variety, anti-slop rules) plus a
 * research- and brand-voice-informed user prompt. The model is asked for STRICT
 * JSON which `copy.ts` parses, validates, and limit-enforces before trusting.
 */

export interface CopyPromptInput {
  platform: AdPlatform;
  count: number;
  angle?: string;
  /** Research pain points to target, in the audience's own words. */
  painPoints?: string[];
  /** Distinctive audience vocabulary surfaced by research. */
  vocabulary?: string[];
  personaName?: string;
  product?: string;
  industry?: string;
  /** Summarized brand tone profile (see brand-voice.ts). */
  toneSummary?: string;
}

const PLATFORM_TACTIC: Record<string, string> = {
  google:
    "Each headline is a standalone idea (mix benefit, proof, and CTA headlines). Front-load the keyword. Headlines must read naturally when shuffled.",
  meta:
    "The first 125 characters of primary text must land the hook before the 'See more' fold. The headline reinforces the click; the description is optional support.",
  tiktok:
    "The hook is spoken on camera in the first 3 seconds - make it stop the scroll. The caption is conversational. The overlay is 3-5 words. The CTA is one direct action.",
  taboola:
    "Native discovery: sound like an editorial headline a curious person would click, not a salesy ad. Open a curiosity gap. Avoid hype punctuation and ALL CAPS.",
};

/** Per-format strict JSON shape the model must return for each variant. */
function jsonShape(spec: PlatformSpec): string {
  switch (spec.format) {
    case "rsa":
      return '{ "headlines": string[12-15], "descriptions": string[3-4], "paths": string[0-2] }';
    case "single":
      return '{ "primaryText": string, "headline": string, "description": string }';
    case "video":
      return '{ "hook": string, "caption": string, "overlay": string, "cta": string }';
    case "native":
      return '{ "headline": string, "branding": string, "description": string }';
    default:
      return '{ "headline": string, "primaryText": string }';
  }
}

/** Human-readable hard limits per role, derived from the spec (single source of truth). */
function describeLimits(spec: PlatformSpec): string {
  return spec.roles
    .map((r) => {
      const count = r.max > 1 ? `${r.min}-${r.max} items` : r.optional ? "optional" : "1";
      return `- ${r.label} (${count}): max ${r.limit} characters`;
    })
    .join("\n");
}

export function buildCopySystemPrompt(platform: AdPlatform): string {
  const spec = getPlatformSpec(platform);
  const tactic = PLATFORM_TACTIC[platform] ?? "Write a tight headline and primary text.";

  return [
    `You are a world-class direct-response copywriter producing platform-ready ${spec.displayName} ads.`,
    "",
    "HARD CHARACTER LIMITS (never exceed - copy that overflows is rejected):",
    describeLimits(spec),
    "",
    "RULES:",
    "- Lead every variant with ONE strong psychological hook: fear, curiosity, FOMO, social proof, urgency, or exclusivity.",
    "- When producing multiple variants, VARY the hook mechanism across the set so they can be A/B tested.",
    "- Ground the copy in the audience's real pain points and vocabulary; speak in their words, not marketing-speak.",
    "- Be concrete: specific numbers, outcomes, and proof beat vague claims.",
    "- No em-dashes, no clichés, no AI-tells, no fabricated statistics or fake testimonials.",
    `- Platform tactic: ${tactic}`,
    "",
    `OUTPUT: ONLY a JSON array of exactly N objects (one per variant), no prose, no markdown fences. Each object: ${jsonShape(spec)}`,
  ].join("\n");
}

export function buildCopyUserPrompt(input: CopyPromptInput): string {
  const lines: string[] = [`Produce ${input.count} distinct ad variant(s).`];

  if (input.product) lines.push(`PRODUCT: ${input.product}`);
  if (input.industry) lines.push(`INDUSTRY: ${input.industry}`);
  if (input.personaName) lines.push(`TARGET PERSONA: ${input.personaName}`);
  if (input.angle) lines.push(`ANGLE TO EMPHASIZE: ${input.angle}`);

  const pains = (input.painPoints ?? []).filter((p) => p.trim().length > 0).slice(0, 8);
  if (pains.length) {
    lines.push("", "AUDIENCE PAIN POINTS (target these directly):");
    lines.push(...pains.map((p) => `- ${p}`));
  }

  const vocab = (input.vocabulary ?? []).filter((v) => v.trim().length > 0).slice(0, 16);
  if (vocab.length) {
    lines.push("", `AUDIENCE VOCABULARY (echo where natural): ${vocab.join(", ")}`);
  }

  if (input.toneSummary && input.toneSummary.trim().length > 0) {
    lines.push("", `BRAND VOICE: ${input.toneSummary}`);
  }

  lines.push("", `Return a JSON array of exactly ${input.count} object(s).`);
  return lines.join("\n");
}
