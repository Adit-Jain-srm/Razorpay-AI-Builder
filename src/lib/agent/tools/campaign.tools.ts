import { z } from "zod";

import { getCampaignBriefAssistant } from "@/lib/campaign/assistant";
import {
  allocationAmount,
  briefSchema,
  budgetPlanSchema,
  decodeCampaign,
  personaIdsFromBrief,
  platformConfigSchema,
  type CampaignView,
} from "@/lib/campaign/brief";
import { adPlatformSchema } from "@/lib/research/standard-models";
import { campaignService } from "@/lib/services";
import type { Json } from "@/types/database";

import { defineTool, type AgentTool } from "../types";
import type {
  BudgetPlanArtifactData,
  CampaignArtifactData,
  CampaignListArtifactData,
  PlatformRecommendationsArtifactData,
} from "./artifacts";
import { MODULE_TOOL_CATEGORY, ok, runToolSafely } from "./shared";

/**
 * Campaign tools - turn a brief into a real, persisted campaign and run the AI
 * Campaign Brief Assistant (platform recommendations + budget allocation). Every
 * tool calls the same `campaignService` / brief assistant the manual builder uses,
 * so the agent and the cockpit can never diverge.
 */

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

const assistInputShape = {
  product: z.string().min(2).max(600).describe("What is being advertised (the offer/product)"),
  offer: z.string().max(400).optional().describe("The specific offer/lead magnet, e.g. 'free 2026 income guide'"),
  audience: z.string().max(400).optional().describe("Who the audience is"),
  goal: z.string().max(120).optional().describe("Objective hint, e.g. 'leads' or 'sales'"),
  platforms: z.array(adPlatformSchema).max(7).optional().describe("Platforms under consideration (scopes the budget split)"),
  budgetTotal: z.number().nonnegative().max(10_000_000).optional().describe("Total budget for the allocation"),
  currency: z.string().max(8).optional().describe("Currency code (default USD)"),
} as const;

function campaignToArtifactData(view: CampaignView): CampaignArtifactData {
  return {
    id: view.id,
    name: view.name,
    status: view.status,
    objective: view.brief.objective,
    product: view.brief.product || undefined,
    offer: view.brief.offer || undefined,
    audience: view.brief.audience || undefined,
    valueProps: view.brief.valueProps.slice(0, 6),
    platforms: view.platformConfig.platforms,
    personaCount: view.brief.personas.length,
    budgetTotal: view.budget.total,
    currency: view.budget.currency,
    source: view.brief.source,
  };
}

export function createCampaignTools(): AgentTool[] {
  const createCampaign = defineTool<
    {
      name: string;
      product: string;
      offer?: string;
      audience?: string;
      goal?: string;
      painPoints?: string[];
      platforms?: ("google" | "meta" | "tiktok" | "taboola" | "linkedin" | "youtube" | "x")[];
      budgetTotal?: number;
      currency?: string;
    },
    CampaignArtifactData
  >({
    name: "create_campaign",
    description:
      "Create a real campaign from a brief. Runs the AI Brief Assistant to draft the objective, value props, tone, audience personas, ranked platform recommendations, and a budget split, then persists the campaign. Pass research-derived painPoints so the brief is grounded in the audience's own language. Returns the new campaign (use its id for creatives, landing pages, and analytics).",
    category: MODULE_TOOL_CATEGORY.campaign,
    parameters: z.object({
      name: z.string().min(1).max(120).describe("Name for the campaign"),
      painPoints: z.array(z.string()).max(12).optional().describe("Research pain points to ground the brief in"),
      ...assistInputShape,
    }),
    execute: async (params) =>
      runToolSafely("create_campaign", async () => {
        const audienceParts = [params.audience?.trim(), params.painPoints?.length ? `Key pain points: ${params.painPoints.join("; ")}` : undefined].filter(
          (part): part is string => Boolean(part),
        );
        const audience = audienceParts.join(". ") || undefined;

        const result = await getCampaignBriefAssistant().assist({
          product: params.product,
          offer: params.offer,
          audience,
          goal: params.goal,
          platforms: params.platforms,
          budgetTotal: params.budgetTotal,
          currency: params.currency,
        });

        const brief = briefSchema.parse({
          objective: result.objective,
          product: params.product,
          offer: params.offer ?? "",
          audience: params.audience ?? "",
          valueProps: result.valueProps,
          tone: result.tone,
          personas: result.personas,
          source: result.source,
        });

        const selected = result.platforms.filter((rec) => rec.fit >= 55).slice(0, 4).map((rec) => rec.platform);
        const platformConfig = platformConfigSchema.parse({
          platforms: selected.length ? selected : result.platforms.slice(0, 3).map((rec) => rec.platform),
          recommendations: result.platforms,
          source: result.source,
        });

        const budget = budgetPlanSchema.parse({
          total: result.budget.total,
          currency: result.budget.currency,
          allocations: result.budget.allocations,
          source: result.budget.source,
        });

        const created = await campaignService.create({
          user_id: "",
          name: params.name,
          status: "draft",
          brief: toJson(brief),
          platform_config: toJson(platformConfig),
          budget: toJson(budget),
          persona_ids: toJson(personaIdsFromBrief(brief)),
        });

        const data = campaignToArtifactData(decodeCampaign(created));
        return ok(data, { type: "campaign", title: `Campaign: ${data.name}`, data });
      }),
  });

  const recommendPlatforms = defineTool<
    {
      product: string;
      offer?: string;
      audience?: string;
      goal?: string;
      platforms?: ("google" | "meta" | "tiktok" | "taboola" | "linkedin" | "youtube" | "x")[];
      budgetTotal?: number;
      currency?: string;
    },
    PlatformRecommendationsArtifactData
  >({
    name: "recommend_platforms",
    description:
      "Recommend which ad platforms (Google, Meta, TikTok, Taboola, YouTube, LinkedIn, X) suit an offer/audience, each with a 0-100 fit score and rationale. Use before creating a campaign or when the user asks where to advertise.",
    category: MODULE_TOOL_CATEGORY.campaign,
    parameters: z.object(assistInputShape),
    execute: async (params) =>
      runToolSafely("recommend_platforms", async () => {
        const recommendations = await getCampaignBriefAssistant().recommendPlatforms(params);
        const data: PlatformRecommendationsArtifactData = {
          recommendations: recommendations.map((rec) => ({ platform: rec.platform, fit: rec.fit, rationale: rec.rationale })),
        };
        return ok(data, { type: "platform-recommendations", title: "Platform recommendations", data });
      }),
  });

  const suggestBudget = defineTool<
    {
      product: string;
      offer?: string;
      audience?: string;
      goal?: string;
      platforms?: ("google" | "meta" | "tiktok" | "taboola" | "linkedin" | "youtube" | "x")[];
      budgetTotal?: number;
      currency?: string;
    },
    BudgetPlanArtifactData
  >({
    name: "suggest_budget",
    description:
      "Suggest a budget split across the recommended platforms, proportional to platform fit and normalized to 100%. Pass budgetTotal to get per-platform spend amounts. Label the result as an estimate.",
    category: MODULE_TOOL_CATEGORY.campaign,
    parameters: z.object(assistInputShape),
    execute: async (params) =>
      runToolSafely("suggest_budget", async () => {
        const budget = await getCampaignBriefAssistant().allocateBudget(params);
        const data: BudgetPlanArtifactData = {
          total: budget.total,
          currency: budget.currency,
          source: budget.source,
          allocations: budget.allocations.map((allocation) => ({
            platform: allocation.platform,
            percent: allocation.percent,
            amount: allocationAmount(allocation, budget.total),
            rationale: allocation.rationale,
          })),
        };
        return ok(data, { type: "budget-plan", title: "Budget allocation", data });
      }),
  });

  const listCampaigns = defineTool<Record<string, never>, CampaignListArtifactData>({
    name: "list_campaigns",
    description: "List the user's campaigns (most recently updated first) with status and selected platforms. Use to find a campaign id to operate on.",
    category: MODULE_TOOL_CATEGORY.campaign,
    parameters: z.object({}),
    execute: async () =>
      runToolSafely("list_campaigns", async () => {
        const rows = await campaignService.list();
        const campaigns = rows.map((row) => {
          const view = decodeCampaign(row);
          return { id: view.id, name: view.name, status: view.status, platforms: view.platformConfig.platforms, updatedAt: view.updatedAt };
        });
        const data: CampaignListArtifactData = { total: campaigns.length, campaigns };
        return ok(data, { type: "campaign-list", title: `Campaigns (${campaigns.length})`, data });
      }),
  });

  const getCampaign = defineTool<{ campaignId: string }, CampaignArtifactData>({
    name: "get_campaign",
    description: "Fetch one campaign's full brief: objective, value props, audience personas, selected platforms, and budget.",
    category: MODULE_TOOL_CATEGORY.campaign,
    parameters: z.object({
      campaignId: z.string().min(1).max(100).describe("The campaign id to fetch"),
    }),
    execute: async (params) =>
      runToolSafely("get_campaign", async () => {
        const row = await campaignService.get(params.campaignId);
        if (!row) return { ok: false, error: `Campaign not found: ${params.campaignId}` };
        const data = campaignToArtifactData(decodeCampaign(row));
        return ok(data, { type: "campaign", title: `Campaign: ${data.name}`, data });
      }),
  });

  return [createCampaign, recommendPlatforms, suggestBudget, listCampaigns, getCampaign];
}
