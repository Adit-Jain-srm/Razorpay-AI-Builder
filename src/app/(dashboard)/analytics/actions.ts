"use server";

import { revalidatePath } from "next/cache";

import {
  buildRecommendations,
  detectCampaignAnomalies,
  distinctDates,
  periodDeltas,
  summarize,
  summarizeByCreative,
  summarizeByPlatform,
  toAnomalyInserts,
  type CreativeMeta,
} from "@/lib/analytics";
import { generateDailyBrief } from "@/lib/analytics/brief";
import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { labelFromContent } from "@/lib/seed/targets";
import { seedAnalytics, type SeedAnalyticsResult } from "@/lib/seed/analytics";
import { analyticsService, campaignService, creativeService } from "@/lib/services";
import type { PerformanceMetricRow } from "@/types/database";

/**
 * Server actions for Performance Intelligence: refresh the AI daily brief
 * (persisting it as an `ai_insights` row), (re)run anomaly detection, resolve an
 * anomaly, and seed analytics for real campaigns. Each returns a discriminated
 * `ActionResult` so the client can branch without try/catch.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function buildCreativeMeta(rows: readonly PerformanceMetricRow[]): Promise<Map<string, CreativeMeta>> {
  const ids = [...new Set(rows.map((r) => r.creative_id).filter((id): id is string => Boolean(id)))];
  const creatives = await Promise.all(ids.map((id) => creativeService.get(id)));
  return new Map(
    creatives
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => [c.id, { id: c.id, label: labelFromContent(c.content, c.platform, c.type), platform: c.platform }]),
  );
}

export async function refreshDailyBriefAction(campaignId: string): Promise<ActionResult<{ source: "ai" | "templated" }>> {
  try {
    const campaign = await campaignService.get(campaignId);
    if (!campaign) return { ok: false, error: "Campaign not found" };

    const rows = await analyticsService.metrics({ campaignId });
    if (rows.length === 0) return { ok: false, error: "No metrics to summarize yet" };

    const meta = await buildCreativeMeta(rows);
    const findings = detectCampaignAnomalies(rows);
    const recommendations = buildRecommendations({ rows, campaignId, meta, anomalies: findings });

    const brief = await generateDailyBrief({
      campaignName: campaign.name,
      rangeDays: distinctDates(rows).length || 90,
      summary: summarize(rows),
      deltas: periodDeltas(rows, 7),
      platforms: summarizeByPlatform(rows),
      topCreatives: summarizeByCreative(rows, meta).slice(0, 3),
      anomalies: findings,
      recommendations,
    });

    await analyticsService.insertInsight({
      campaign_id: campaignId,
      type: "daily_brief",
      content: brief.content,
      confidence: brief.confidence,
    });

    revalidatePath(`/analytics/${campaignId}`);
    return { ok: true, data: { source: brief.source } };
  } catch (error) {
    logger.error("refreshDailyBriefAction failed", error, { campaignId });
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function runAnomalyDetectionAction(campaignId: string): Promise<ActionResult<{ count: number }>> {
  try {
    const rows = await analyticsService.metrics({ campaignId });
    const findings = detectCampaignAnomalies(rows);
    const count = findings.length === 0 ? 0 : await analyticsService.insertAnomalies(toAnomalyInserts(findings, campaignId));
    revalidatePath(`/analytics/${campaignId}`);
    return { ok: true, data: { count } };
  } catch (error) {
    logger.error("runAnomalyDetectionAction failed", error, { campaignId });
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function resolveAnomalyAction(id: string, campaignId: string): Promise<ActionResult<null>> {
  try {
    await analyticsService.resolveAnomaly(id);
    revalidatePath(`/analytics/${campaignId}`);
    return { ok: true, data: null };
  } catch (error) {
    logger.error("resolveAnomalyAction failed", error, { id });
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function seedDemoAnalyticsAction(): Promise<ActionResult<SeedAnalyticsResult>> {
  try {
    const result = await seedAnalytics({ force: false });
    revalidatePath("/analytics");
    return { ok: true, data: result };
  } catch (error) {
    logger.error("seedDemoAnalyticsAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}
