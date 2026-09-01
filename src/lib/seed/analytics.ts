import {
  buildRecommendations,
  detectCampaignAnomalies,
  periodDeltas,
  summarize,
  summarizeByCreative,
  summarizeByPlatform,
  toAnomalyInserts,
} from "@/lib/analytics";
import { templatedBrief } from "@/lib/analytics/brief";
import type { CreativeMeta } from "@/lib/analytics/types";
import { logger } from "@/lib/logger";
import { adPlatformSchema } from "@/lib/research/standard-models";
import { analyticsService } from "@/lib/services/analytics.service";
import { campaignService } from "@/lib/services/campaign.service";
import { creativeService } from "@/lib/services/creative.service";
import type { PerformanceMetricInsert } from "@/types/database";

import { generateMetrics, type SeedCampaignTarget, type SeedCreativeTarget } from "./analytics-generator";
import { ANALYTICS_DEMO_CAMPAIGN_ID, buildDemoSeedTargets, labelFromContent } from "./targets";

/**
 * Runnable, IDEMPOTENT analytics seeder. Reads REAL campaign + creative ids via
 * the implemented services, generates 90 days of deterministic multi-platform
 * metrics per campaign, persists them through `analyticsService`, then detects +
 * stores anomalies and an initial templated daily brief.
 *
 * Reusable by the later demo-seed phase. SERVER ONLY (pulls the cookie-bound
 * Supabase client through the services). The credential-free in-memory demo seeds
 * itself inside `analytics.service`; this entry is for persisted backends.
 */

/** Build analytics seed targets from real campaigns + their creatives. */
export async function collectSeedTargets(): Promise<SeedCampaignTarget[]> {
  const campaigns = await campaignService.list();
  const targets: SeedCampaignTarget[] = [];

  for (const campaign of campaigns) {
    const creatives = await creativeService.listByCampaign(campaign.id);
    const seedCreatives: SeedCreativeTarget[] = [];
    for (const creative of creatives) {
      const platform = adPlatformSchema.safeParse(creative.platform);
      if (!platform.success) continue;
      seedCreatives.push({
        id: creative.id,
        platform: platform.data,
        label: labelFromContent(creative.content, creative.platform, creative.type),
      });
    }
    if (seedCreatives.length === 0) {
      // Fallback: when creatives aren't returned by the service (e.g. in-memory
      // store doesn't index by campaign_id), use the fixture-based targets.
      if (campaign.id === ANALYTICS_DEMO_CAMPAIGN_ID) {
        targets.push({ ...buildDemoSeedTargets(), name: campaign.name });
      }
      continue;
    }
    targets.push({ campaignId: campaign.id, name: campaign.name, creatives: seedCreatives });
  }

  return targets;
}

function creativeMetaFromTarget(target: SeedCampaignTarget): Map<string, CreativeMeta> {
  return new Map(
    target.creatives.map((c) => [c.id, { id: c.id, label: c.label ?? c.id, platform: c.platform }]),
  );
}

export interface SeedAnalyticsOptions {
  days?: number;
  /** Inclusive end date (`YYYY-MM-DD`). Default: today. */
  endDate?: string;
  /** Re-seed even when a campaign already has metrics. Default false (idempotent). */
  force?: boolean;
  injectAnomalies?: boolean;
  /** Also detect + store anomalies. Default true. */
  storeAnomalies?: boolean;
  /** Also store an initial templated daily brief. Default true. */
  storeBrief?: boolean;
}

export interface SeedAnalyticsResult {
  campaigns: number;
  metricsWritten: number;
  anomaliesWritten: number;
  briefsWritten: number;
  /** Campaign ids skipped because they already had metrics (idempotency). */
  skipped: string[];
}

/**
 * Seed analytics for every real campaign that has creatives. Idempotent: a
 * campaign that already has metrics is skipped unless `force` is set.
 */
export async function seedAnalytics(options: SeedAnalyticsOptions = {}): Promise<SeedAnalyticsResult> {
  const { days = 90, endDate, force = false, injectAnomalies = true, storeAnomalies = true, storeBrief = true } = options;
  const result: SeedAnalyticsResult = { campaigns: 0, metricsWritten: 0, anomaliesWritten: 0, briefsWritten: 0, skipped: [] };

  let targets: SeedCampaignTarget[];
  try {
    targets = await collectSeedTargets();
  } catch (error) {
    logger.error("seedAnalytics: collectSeedTargets failed", error);
    return result;
  }

  for (const target of targets) {
    try {
      if (!force) {
        const existing = await analyticsService.metrics({ campaignId: target.campaignId });
        if (existing.length > 0) {
          result.skipped.push(target.campaignId);
          continue;
        }
      }

      const { metrics } = generateMetrics(target, { days, endDate, seed: target.campaignId, injectAnomalies });
      const inserts: PerformanceMetricInsert[] = metrics.map((seed) => ({ ...seed, user_id: "" }));
      result.metricsWritten += await analyticsService.insertMetrics(inserts);
      result.campaigns += 1;

      const rows = await analyticsService.metrics({ campaignId: target.campaignId });

      if (storeAnomalies) {
        const findings = detectCampaignAnomalies(rows);
        if (findings.length > 0) {
          result.anomaliesWritten += await analyticsService.insertAnomalies(toAnomalyInserts(findings, target.campaignId));
        }
      }

      if (storeBrief) {
        const meta = creativeMetaFromTarget(target);
        const summary = summarize(rows);
        const content = templatedBrief({
          campaignName: target.name,
          rangeDays: days,
          summary,
          deltas: periodDeltas(rows, 7, endDate),
          platforms: summarizeByPlatform(rows),
          topCreatives: summarizeByCreative(rows, meta).slice(0, 3),
          anomalies: detectCampaignAnomalies(rows),
          recommendations: buildRecommendations({ rows, campaignId: target.campaignId, meta }),
        });
        await analyticsService.insertInsight({
          campaign_id: target.campaignId,
          type: "daily_brief",
          content,
          confidence: 0.55,
        });
        result.briefsWritten += 1;
      }
    } catch (error) {
      logger.error("seedAnalytics: failed to seed campaign", error, { campaignId: target.campaignId });
    }
  }

  logger.info("seedAnalytics complete", { ...result, skipped: result.skipped.length });
  return result;
}
