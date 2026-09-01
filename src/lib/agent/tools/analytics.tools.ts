import { z } from "zod";

import {
  buildRecommendations,
  detectCampaignAnomalies,
  distinctDates,
  periodDeltas,
  summarize,
  summarizeByCreative,
  summarizeByPlatform,
  type AnomalyFinding,
  type CreativeMeta,
  type Recommendation,
} from "@/lib/analytics";
import { generateDailyBrief } from "@/lib/analytics/brief";
import { analyticsService, campaignService, creativeService } from "@/lib/services";
import { labelFromContent } from "@/lib/seed/targets";
import type { PerformanceMetric } from "@/types/database";

import type { SuggestedAction } from "../events";
import { defineTool, type AgentTool } from "../types";
import type {
  AnalyticsSummaryArtifactData,
  AnomaliesArtifactData,
  AnomalyCard,
  DailyBriefArtifactData,
  ProactiveBriefingArtifactData,
  RecommendationCard,
  RecommendationsArtifactData,
} from "./artifacts";
import { MODULE_TOOL_CATEGORY, OPERATOR_DEMO_CAMPAIGN_ID, ok, resolveCampaignId, runToolSafely } from "./shared";

/**
 * Analytics tools - Performance Intelligence as agent capabilities: roll-ups,
 * z-score anomaly detection, the recommendation engine, the AI daily brief, and a
 * proactive briefing that fuses all three into the Operator's improvement loop.
 */

/** Resolve creative labels for the rows' creative ids (for recommendations + brief). */
async function buildCreativeMeta(rows: readonly PerformanceMetric[]): Promise<Map<string, CreativeMeta>> {
  const ids = [...new Set(rows.map((row) => row.creative_id).filter((id): id is string => Boolean(id)))];
  const creatives = await Promise.all(ids.map((id) => creativeService.get(id)));
  return new Map(
    creatives
      .filter((creative): creative is NonNullable<typeof creative> => Boolean(creative))
      .map((creative) => [
        creative.id,
        { id: creative.id, label: labelFromContent(creative.content, creative.platform, creative.type), platform: creative.platform },
      ]),
  );
}

function anomalyToCard(finding: AnomalyFinding): AnomalyCard {
  return { metric: finding.metric, platform: finding.platform, severity: finding.severity, description: finding.description };
}

function recToCard(rec: Recommendation): RecommendationCard {
  return {
    id: rec.id,
    type: rec.type,
    priority: rec.priority,
    title: rec.title,
    rationale: rec.rationale,
    metricLabel: rec.metricLabel,
    creativeId: rec.creativeId,
    platform: rec.platform,
  };
}

/** Turn a recommendation into a one-tap follow-up prompt that drives a real tool. */
function recToAction(rec: Recommendation, campaignId: string): SuggestedAction {
  switch (rec.type) {
    case "refresh":
    case "pause":
      return {
        id: rec.id,
        label: rec.title,
        prompt: rec.creativeId
          ? `Regenerate the underperforming creative ${rec.creativeId} (it triggered: ${rec.rationale}) and show its new hook and score.`
          : `Address this on campaign ${campaignId}: ${rec.title}. ${rec.rationale}`,
      };
    case "scale":
      return {
        id: rec.id,
        label: rec.title,
        prompt: `Generate 3 more ${rec.platform ?? "ad"} creatives to scale the winning angle for campaign ${campaignId}.`,
      };
    case "reallocate":
      return {
        id: rec.id,
        label: rec.title,
        prompt: `Suggest an updated budget split for campaign ${campaignId} that shifts spend toward ${rec.platform ?? "the top platform"}.`,
      };
    case "investigate":
    default:
      return { id: rec.id, label: rec.title, prompt: `Investigate this for campaign ${campaignId}: ${rec.title}. ${rec.rationale}` };
  }
}

export function createAnalyticsTools(): AgentTool[] {
  const getSummary = defineTool<{ campaignId?: string; from?: string; to?: string }, AnalyticsSummaryArtifactData>({
    name: "get_performance_summary",
    description:
      "Summarize a campaign's performance: totals (spend, conversions, CPA, ROAS, CTR, CVR) plus a per-platform breakdown. Defaults to the seeded demo campaign. Optionally bound by from/to ISO dates.",
    category: MODULE_TOOL_CATEGORY.analytics,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign to summarize (defaults to the demo campaign)"),
      from: z.string().max(10).optional().describe("Inclusive start date YYYY-MM-DD"),
      to: z.string().max(10).optional().describe("Inclusive end date YYYY-MM-DD"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("get_performance_summary", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CAMPAIGN_ID);
        const rows = await analyticsService.metrics({ campaignId, from: params.from, to: params.to });
        const data: AnalyticsSummaryArtifactData = {
          campaignId,
          rangeDays: distinctDates(rows).length,
          summary: summarize(rows),
          platforms: summarizeByPlatform(rows).map((platform) => ({
            platform: platform.platform,
            spend: platform.spend,
            roas: platform.roas,
            cpa: platform.cpa,
            spendShare: platform.spendShare,
          })),
        };
        return ok(data, { type: "analytics-summary", title: "Performance summary", data });
      }),
  });

  const detectAnomalies = defineTool<{ campaignId?: string }, AnomaliesArtifactData>({
    name: "detect_anomalies",
    description:
      "Run z-score anomaly detection over a campaign's CPA / CTR / spend time series (per platform and overall). Surfaces the most severe, most recent deviations worth acting on.",
    category: MODULE_TOOL_CATEGORY.analytics,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign to scan (defaults to the demo campaign)"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("detect_anomalies", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CAMPAIGN_ID);
        const rows = await analyticsService.metrics({ campaignId });
        const findings = detectCampaignAnomalies(rows);
        const data: AnomaliesArtifactData = { campaignId, total: findings.length, anomalies: findings.map(anomalyToCard) };
        return ok(data, { type: "anomalies", title: `Anomalies (${findings.length})`, data });
      }),
  });

  const getRecommendations = defineTool<{ campaignId?: string }, RecommendationsArtifactData>({
    name: "get_recommendations",
    description:
      "Get the ranked, evidence-backed action list for a campaign: scale a low-CPA winner, pause/refresh fatigued creatives, reallocate budget to the best-ROAS platform, investigate anomalies. Each recommendation references the real creative/platform it concerns - the input to the improvement loop.",
    category: MODULE_TOOL_CATEGORY.analytics,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign to analyze (defaults to the demo campaign)"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("get_recommendations", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CAMPAIGN_ID);
        const rows = await analyticsService.metrics({ campaignId });
        const meta = await buildCreativeMeta(rows);
        const findings = detectCampaignAnomalies(rows);
        const recommendations = buildRecommendations({ rows, campaignId, meta, anomalies: findings });
        const data: RecommendationsArtifactData = {
          campaignId,
          total: recommendations.length,
          recommendations: recommendations.map(recToCard),
        };
        return ok(data, { type: "recommendations", title: `Recommendations (${recommendations.length})`, data });
      }),
  });

  const dailyBrief = defineTool<{ campaignId?: string }, DailyBriefArtifactData>({
    name: "daily_brief",
    description:
      "Produce a natural-language daily brief for a campaign: headline result, key week-over-week trend, standout platform, any anomaly worth acting on, and a recommended next action. Uses GPT-4o when configured, else a deterministic templated brief.",
    category: MODULE_TOOL_CATEGORY.analytics,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign to brief on (defaults to the demo campaign)"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("daily_brief", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CAMPAIGN_ID);
        const [campaign, rows] = await Promise.all([campaignService.get(campaignId), analyticsService.metrics({ campaignId })]);
        if (rows.length === 0) return { ok: false, error: "No performance metrics for this campaign yet." };

        const campaignName = campaign?.name ?? "Campaign";
        const meta = await buildCreativeMeta(rows);
        const findings = detectCampaignAnomalies(rows);
        const recommendations = buildRecommendations({ rows, campaignId, meta, anomalies: findings });
        const brief = await generateDailyBrief({
          campaignName,
          rangeDays: distinctDates(rows).length || 90,
          summary: summarize(rows),
          deltas: periodDeltas(rows, 7),
          platforms: summarizeByPlatform(rows),
          topCreatives: summarizeByCreative(rows, meta).slice(0, 3),
          anomalies: findings,
          recommendations,
        });

        const data: DailyBriefArtifactData = {
          campaignId,
          campaignName,
          rangeDays: distinctDates(rows).length || 90,
          content: brief.content,
          source: brief.source,
          confidence: brief.confidence,
        };
        return ok(data, { type: "daily-brief", title: `Daily brief: ${campaignName}`, data });
      }),
  });

  const proactiveBriefing = defineTool<{ campaignId?: string }, ProactiveBriefingArtifactData>({
    name: "proactive_briefing",
    description:
      "Produce a proactive operator briefing for a campaign: the daily brief, the top anomalies, the ranked recommendations, and one-tap next actions that drive the improvement loop (e.g. regenerate the weakest creative). Use this to open a session or when the user asks 'what should I do today?'.",
    category: MODULE_TOOL_CATEGORY.analytics,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign to brief on (defaults to the demo campaign)"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("proactive_briefing", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CAMPAIGN_ID);
        const [campaign, rows] = await Promise.all([campaignService.get(campaignId), analyticsService.metrics({ campaignId })]);
        if (rows.length === 0) return { ok: false, error: "No performance metrics for this campaign yet." };

        const campaignName = campaign?.name ?? "Campaign";
        const meta = await buildCreativeMeta(rows);
        const findings = detectCampaignAnomalies(rows);
        const recommendations = buildRecommendations({ rows, campaignId, meta, anomalies: findings });
        const rangeDays = distinctDates(rows).length || 90;
        const brief = await generateDailyBrief({
          campaignName,
          rangeDays,
          summary: summarize(rows),
          deltas: periodDeltas(rows, 7),
          platforms: summarizeByPlatform(rows),
          topCreatives: summarizeByCreative(rows, meta).slice(0, 3),
          anomalies: findings,
          recommendations,
        });

        const data: ProactiveBriefingArtifactData = {
          campaignId,
          campaignName,
          brief: { campaignId, campaignName, rangeDays, content: brief.content, source: brief.source, confidence: brief.confidence },
          anomalies: findings.slice(0, 4).map(anomalyToCard),
          recommendations: recommendations.map(recToCard),
          nextActions: recommendations.slice(0, 3).map((rec) => recToAction(rec, campaignId)),
        };
        return ok(data, { type: "proactive-briefing", title: `Briefing: ${campaignName}`, data });
      }),
  });

  return [getSummary, detectAnomalies, getRecommendations, dailyBrief, proactiveBriefing];
}
