import { z } from "zod";

import { assembleVariant, type RawByRole } from "@/lib/creative/assemble";
import { scoreGrade } from "@/lib/creative/scoring";
import { generateCreatives, regenerateCreative, type CreativeView } from "@/lib/creative/studio";
import { parseCreativeContent, type CreativeContent } from "@/lib/creative/types";
import { adPlatformSchema, type AdPlatform } from "@/lib/research/standard-models";
import { creativeService } from "@/lib/services";

import { defineTool, type AgentTool } from "../types";
import type { CreativeScoreArtifactData, CreativeSetArtifactData, CreativeVariantCard } from "./artifacts";
import { MODULE_TOOL_CATEGORY, OPERATOR_DEMO_CONTENT_CAMPAIGN_ID, ok, resolveCampaignId, runToolSafely } from "./shared";

/**
 * Creative tools - platform-aware copy generation with psychological hook
 * analysis + direct-response scoring, and an ad-hoc scorer. All run through the
 * same Creative Studio orchestration the manual screens use, so generated copy is
 * limit-enforced, hook-classified, and scored identically.
 */

function viewToCard(view: CreativeView): CreativeVariantCard {
  const content = view.content;
  return {
    id: view.id,
    platform: view.platform,
    format: content.format,
    headline: content.headline,
    body: content.body,
    hookType: content.hook.type,
    hookConfidence: content.hook.confidence,
    score: content.score.total,
    grade: scoreGrade(content.score.total),
    angle: content.angle,
    flags: content.flags,
  };
}

function scoreToArtifactData(content: CreativeContent): CreativeScoreArtifactData {
  return {
    platform: content.platform,
    headline: content.headline,
    hookType: content.hook.type,
    hookConfidence: content.hook.confidence,
    total: content.score.total,
    grade: scoreGrade(content.score.total),
    breakdown: content.score.breakdown,
    notes: content.score.notes,
  };
}

/** Maps free-form copy onto every plausible platform role; the spec ignores the rest. */
function buildByRole(input: { headline?: string; body?: string; cta?: string }): RawByRole {
  const byRole: RawByRole = {};
  if (input.headline?.trim()) {
    byRole.headline = [input.headline];
    byRole.hook = [input.headline];
  }
  if (input.body?.trim()) {
    byRole.primary_text = [input.body];
    byRole.caption = [input.body];
    byRole.description = [input.body];
    byRole.overlay = [input.body];
  }
  if (input.cta?.trim()) byRole.cta = [input.cta];
  return byRole;
}

export function createCreativeTools(): AgentTool[] {
  const generate = defineTool<
    {
      campaignId?: string;
      platform: AdPlatform;
      angle?: string;
      painPoints?: string[];
      count?: number;
    },
    CreativeSetArtifactData
  >({
    name: "generate_creatives",
    description:
      "Generate platform-ready ad creatives for a campaign. Each variant is limit-enforced, classified by psychological hook (fear, curiosity, FOMO, social proof, urgency, exclusivity), and scored 0-100 for direct-response quality. Pass research painPoints so the copy targets the audience's real language. Defaults to the seeded demo campaign when no campaignId is given.",
    category: MODULE_TOOL_CATEGORY.creative,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign to attach the creatives to (defaults to the demo campaign)"),
      platform: adPlatformSchema.describe("Ad platform: google, meta, tiktok, taboola, youtube, linkedin, or x"),
      angle: z.string().max(160).optional().describe("The positioning/angle to test, e.g. 'inflation protection'"),
      painPoints: z.array(z.string()).max(12).optional().describe("Research pain points the copy should target"),
      count: z.number().int().min(1).max(6).optional().describe("How many variants to produce (default 3)"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("generate_creatives", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CONTENT_CAMPAIGN_ID);
        const result = await generateCreatives({
          campaignId,
          platform: params.platform,
          angle: params.angle,
          painPoints: params.painPoints ?? [],
          count: params.count ?? 3,
        });
        const data: CreativeSetArtifactData = {
          campaignId,
          platform: params.platform,
          source: result.source,
          variants: result.creatives.map(viewToCard),
        };
        return ok(data, { type: "creative-set", title: `${data.variants.length} ${params.platform} creatives`, data });
      }),
  });

  const score = defineTool<
    { creativeId?: string; platform?: AdPlatform; headline?: string; body?: string; cta?: string; angle?: string },
    CreativeScoreArtifactData
  >({
    name: "score_creative",
    description:
      "Score a creative against direct-response best practices (clarity, specificity, CTA strength, hook strength) and classify its hook. Pass a creativeId to score an existing variant, or pass platform + headline/body/cta to score ad-hoc copy.",
    category: MODULE_TOOL_CATEGORY.creative,
    parameters: z.object({
      creativeId: z.string().max(100).optional().describe("Existing creative id to score"),
      platform: adPlatformSchema.optional().describe("Platform (required when scoring ad-hoc copy)"),
      headline: z.string().max(400).optional().describe("Headline/hook copy to score"),
      body: z.string().max(2000).optional().describe("Body/primary text to score"),
      cta: z.string().max(80).optional().describe("Call-to-action text"),
      angle: z.string().max(160).optional().describe("Optional angle label for ad-hoc copy"),
    }),
    execute: async (params) =>
      runToolSafely("score_creative", async () => {
        if (params.creativeId) {
          const row = await creativeService.get(params.creativeId);
          if (!row) return { ok: false, error: `Creative not found: ${params.creativeId}` };
          const content = parseCreativeContent(row.content);
          if (!content) return { ok: false, error: "Creative content could not be parsed." };
          const data = scoreToArtifactData(content);
          return ok(data, { type: "creative-score", title: `Score: ${data.headline || params.creativeId}`, data });
        }

        if (!params.platform) return { ok: false, error: "Provide a creativeId, or a platform + copy to score." };
        if (!params.headline?.trim() && !params.body?.trim()) {
          return { ok: false, error: "Provide headline and/or body copy to score." };
        }

        const content = assembleVariant(params.platform, buildByRole(params), { angle: params.angle });
        const data = scoreToArtifactData(content);
        return ok(data, { type: "creative-score", title: `Score: ${data.headline || params.platform}`, data });
      }),
  });

  const regenerate = defineTool<{ creativeId: string }, CreativeSetArtifactData>({
    name: "regenerate_creative",
    description:
      "Regenerate a single underperforming creative in place (same platform + angle), bumping its version. Use this to act on a 'refresh' or 'pause' recommendation - the improvement loop's repair step.",
    category: MODULE_TOOL_CATEGORY.creative,
    parameters: z.object({
      creativeId: z.string().min(1).max(100).describe("The creative id to regenerate"),
    }),
    execute: async (params) =>
      runToolSafely("regenerate_creative", async () => {
        const view = await regenerateCreative(params.creativeId);
        const data: CreativeSetArtifactData = {
          campaignId: view.campaignId,
          platform: view.platform,
          regenerated: true,
          variants: [viewToCard(view)],
        };
        return ok(data, { type: "creative-set", title: `Regenerated ${view.platform} creative`, data });
      }),
  });

  return [generate, score, regenerate];
}
