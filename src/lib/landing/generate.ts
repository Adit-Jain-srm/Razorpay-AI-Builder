import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

import { buildLandingSystemPrompt, buildLandingUserPrompt } from "./prompts";
import { buildLandingDocument, type LandingContext } from "./templates";
import {
  landingCopySpecSchema,
  type ExperimentMeta,
  type LandingDocument,
  type LandingTemplate,
} from "./types";

/**
 * SERVER-ONLY landing-page copy generation. Asks Azure GPT-4o for a single
 * strict-JSON `LandingCopySpec`, extracts + zod-validates it, then maps it onto
 * the chosen template via `buildLandingDocument` (which fills any gaps with
 * deterministic context-derived copy).
 *
 * Resilience: if Azure is unconfigured, or the call/parse fails, it degrades to
 * a SEEDED document so generation always returns a compelling, renderable page
 * (credential-free demo). All model output is validated before it is trusted.
 */

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

export interface GenerateLandingInput {
  template: LandingTemplate;
  context: LandingContext;
  experiment?: ExperimentMeta | null;
  signal?: AbortSignal;
}

export interface GenerateLandingResult {
  document: LandingDocument;
  /** Where the copy came from - drives the "configure Azure" UI hint. */
  source: "ai" | "seeded";
}

function seeded(input: GenerateLandingInput): GenerateLandingResult {
  return {
    document: buildLandingDocument(input.template, input.context, {
      source: "seeded",
      experiment: input.experiment ?? null,
    }),
    source: "seeded",
  };
}

/**
 * Generates a validated `LandingDocument` for a template + campaign context.
 * Never throws: any failure returns a seeded document instead.
 */
export async function generateLandingDocument(input: GenerateLandingInput): Promise<GenerateLandingResult> {
  if (!isAzureConfigured()) return seeded(input);

  try {
    const { text } = await generateChat({
      system: buildLandingSystemPrompt(input.template),
      prompt: buildLandingUserPrompt(input.template, input.context),
      temperature: 0.7,
      maxOutputTokens: 2600,
      signal: input.signal,
    });

    const parsed = landingCopySpecSchema.safeParse(extractJson(text));
    if (!parsed.success) {
      logger.warn("Landing copy spec failed validation - using seeded fallback", {
        template: input.template,
        issues: parsed.error.issues.length,
      });
      return seeded(input);
    }

    const document = buildLandingDocument(input.template, input.context, {
      copy: parsed.data,
      source: "ai",
      experiment: input.experiment ?? null,
    });
    return { document, source: "ai" };
  } catch (error) {
    logger.warn("Landing generation failed - using seeded fallback", {
      template: input.template,
      error: String(error),
    });
    return seeded(input);
  }
}
