import { z } from "zod";

import { streamChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { AdPlatform } from "@/lib/research/standard-models";

import { assembleVariant, type AssembleMeta, type RawByRole } from "./assemble";
import { buildSeededCreatives } from "./fixtures";
import { getPlatformSpec } from "./platforms";
import { buildCopySystemPrompt, buildCopyUserPrompt, type CopyPromptInput } from "./prompts";
import type { CreativeContent } from "./types";

/**
 * SERVER-ONLY copy generation. Streams structured JSON from Azure GPT-4o via
 * `streamChat`, surfaces token deltas for live UI, then parses + zod-validates +
 * limit-enforces each variant through the shared `assembleVariant` pipeline.
 *
 * Resilience: if Azure is unconfigured, or the call/parse fails, it degrades to
 * SEEDED variants so generation always returns something usable (credential-free
 * demo). All model output is validated before it is trusted.
 */

/* -------------------------------------------------------------------------- */
/* Per-format raw model schemas (what we ask the model to return)             */
/* -------------------------------------------------------------------------- */

const stringArray = z.array(z.string()).default([]);

const googleRawSchema = z.object({
  headlines: stringArray,
  descriptions: stringArray,
  paths: stringArray,
});
const metaRawSchema = z.object({
  primaryText: z.string().default(""),
  headline: z.string().default(""),
  description: z.string().default(""),
});
const tiktokRawSchema = z.object({
  hook: z.string().default(""),
  caption: z.string().default(""),
  overlay: z.string().default(""),
  cta: z.string().default(""),
});
const taboolaRawSchema = z.object({
  headline: z.string().default(""),
  branding: z.string().default(""),
  description: z.string().default(""),
});
const genericRawSchema = z.object({
  headline: z.string().default(""),
  primaryText: z.string().default(""),
});

/** Maps a single validated raw variant object to per-role strings. */
function rawToByRole(platform: AdPlatform, raw: unknown): RawByRole | null {
  const format = getPlatformSpec(platform).format;
  switch (format) {
    case "rsa": {
      const p = googleRawSchema.safeParse(raw);
      if (!p.success) return null;
      return { headline: p.data.headlines, description: p.data.descriptions, path: p.data.paths };
    }
    case "single": {
      const p = metaRawSchema.safeParse(raw);
      if (!p.success) return null;
      return { primary_text: [p.data.primaryText], headline: [p.data.headline], description: [p.data.description] };
    }
    case "video": {
      const p = tiktokRawSchema.safeParse(raw);
      if (!p.success) return null;
      return { hook: [p.data.hook], caption: [p.data.caption], overlay: [p.data.overlay], cta: [p.data.cta] };
    }
    case "native": {
      const p = taboolaRawSchema.safeParse(raw);
      if (!p.success) return null;
      return { headline: [p.data.headline], branding: [p.data.branding], description: [p.data.description] };
    }
    default: {
      const p = genericRawSchema.safeParse(raw);
      if (!p.success) return null;
      return { headline: [p.data.headline], primary_text: [p.data.primaryText] };
    }
  }
}

/** Best-effort JSON extraction from model output (handles fences + prose). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output");
  const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));
  if (end <= start) throw new Error("Malformed JSON in model output");
  return JSON.parse(body.slice(start, end + 1));
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

export interface GenerateCopyInput extends CopyPromptInput {
  signal?: AbortSignal;
  /** Stable batch id grouping these variants as one A/B set. */
  batchId?: string;
  /** Streamed raw token deltas for live "typing" UI. */
  onDelta?: (delta: string) => void;
}

export interface GenerateCopyResult {
  variants: CreativeContent[];
  /** Where the copy came from - drives the "configure Azure" UI hint. */
  source: "ai" | "seeded";
}

function randomBatchId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `batch_${Date.now().toString(36)}`;
}

/** Seeded fallback variants for a platform (credential-free + parse-failure path). */
function seededVariantsFor(platform: AdPlatform, count: number, meta: AssembleMeta): CreativeContent[] {
  const seeded = buildSeededCreatives()
    .map((s) => s.content)
    .filter((c) => c.platform === platform);
  if (seeded.length > 0) {
    return seeded.slice(0, Math.max(1, count)).map((content) => ({ ...content, batchId: meta.batchId ?? content.batchId }));
  }
  // No seed for this platform: synthesize a single generic sample so the UI renders.
  const byRole: RawByRole =
    getPlatformSpec(platform).format === "rsa"
      ? {
          headline: ["Sample headline", "A second angle", "Proof and benefit"],
          description: ["A clear, specific description for this platform.", "A supporting line with a call to action."],
        }
      : { headline: ["Sample headline that hooks"], primary_text: ["A clear, specific message that opens with a strong hook and ends with a call to action."] };
  return [assembleVariant(platform, byRole, meta)];
}

/**
 * Generates `count` validated, limit-enforced variants for a platform. Streams
 * via `streamChat`; on any failure returns seeded variants instead of throwing.
 */
export async function generateCopy(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  const batchId = input.batchId ?? randomBatchId();
  const meta: AssembleMeta = {
    angle: input.angle,
    painPointsTargeted: input.painPoints,
    batchId,
  };

  if (!isAzureConfigured()) {
    return { variants: seededVariantsFor(input.platform, input.count, meta), source: "seeded" };
  }

  try {
    const result = streamChat({
      system: buildCopySystemPrompt(input.platform),
      prompt: buildCopyUserPrompt(input),
      temperature: 0.8,
      maxOutputTokens: Math.min(4000, 700 + input.count * 350),
      signal: input.signal,
    });

    let full = "";
    for await (const delta of result.textStream) {
      full += delta;
      input.onDelta?.(delta);
    }

    const parsed = extractJson(full);
    const rawArray = Array.isArray(parsed) ? parsed : [parsed];

    const variants: CreativeContent[] = [];
    for (const raw of rawArray.slice(0, input.count)) {
      const byRole = rawToByRole(input.platform, raw);
      if (!byRole) continue;
      const content = assembleVariant(input.platform, byRole, meta);
      if (content.headline.trim().length > 0 || content.body.trim().length > 0) variants.push(content);
    }

    if (variants.length === 0) {
      logger.warn("Copy generation produced no valid variants - using seeded fallback", { platform: input.platform });
      return { variants: seededVariantsFor(input.platform, input.count, meta), source: "seeded" };
    }

    return { variants, source: "ai" };
  } catch (error) {
    logger.warn("Copy generation failed - using seeded fallback", { platform: input.platform, error: String(error) });
    return { variants: seededVariantsFor(input.platform, input.count, meta), source: "seeded" };
  }
}
