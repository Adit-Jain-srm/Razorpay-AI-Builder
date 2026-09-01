import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import {
  buildRecommendations,
  detectCampaignAnomalies,
  distinctDates,
  periodDeltas,
  summarize,
  summarizeByCreative,
  summarizeByPlatform,
  type CreativeMeta,
  type DailyBriefResult,
} from "@/lib/analytics";
import { templatedBrief } from "@/lib/analytics/brief";
import { ANOMALY_SEVERITIES, type AnomalySeverity } from "@/lib/analytics/types";
import { labelFromContent } from "@/lib/seed/targets";
import { analyticsService, campaignService, creativeService } from "@/lib/services";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { CampaignAnalytics } from "@/components/analytics/campaign-analytics";
import type { AnomalyView } from "@/components/analytics/anomalies-feed";
import { BriefActions } from "@/components/analytics/analytics-actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Campaign analytics" };

// Per-request store (Supabase RLS or seeded in-memory) - never statically cache.
export const dynamic = "force-dynamic";

function coerceSeverity(value: string): AnomalySeverity {
  return (ANOMALY_SEVERITIES as readonly string[]).includes(value) ? (value as AnomalySeverity) : "low";
}

export default async function CampaignAnalyticsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const campaign = await campaignService.get(campaignId);
  if (!campaign) notFound();

  const rows = await analyticsService.metrics({ campaignId });

  // Resolve creative labels by id (works across the campaign/creative id split).
  const creativeIds = [...new Set(rows.map((r) => r.creative_id).filter((id): id is string => Boolean(id)))];
  const creativeRows = await Promise.all(creativeIds.map((id) => creativeService.get(id)));
  const creativeMeta: CreativeMeta[] = creativeRows
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, label: labelFromContent(c.content, c.platform, c.type), platform: c.platform }));
  const metaMap = new Map(creativeMeta.map((m) => [m.id, m]));

  const findings = detectCampaignAnomalies(rows);
  const recommendations = buildRecommendations({ rows, campaignId, meta: metaMap, anomalies: findings });

  // Prefer persisted anomalies (e.g. from the seeder); fall back to live detection.
  const storedAnomalies = await analyticsService.anomalies(campaignId);
  const anomalies: AnomalyView[] =
    storedAnomalies.length > 0
      ? storedAnomalies.map((a) => ({
          id: a.id,
          metric: a.metric,
          severity: coerceSeverity(a.severity),
          description: a.description,
          detectedAt: a.detected_at,
          resolvedAt: a.resolved_at,
        }))
      : findings.map((f) => ({
          id: `${f.metric}:${f.platform}:${f.detectedAt}`,
          metric: f.platform === "all" ? f.metric : `${f.metric}:${f.platform}`,
          severity: f.severity,
          description: f.description,
          detectedAt: f.detectedAt,
          resolvedAt: null,
        }));

  const rangeDays = distinctDates(rows).length || 90;

  // Prefer a persisted brief; otherwise render the credential-free templated one.
  const insights = await analyticsService.insights(campaignId);
  const storedBrief = insights.find((i) => i.type === "daily_brief");
  let brief: DailyBriefResult;
  if (storedBrief) {
    brief = {
      content: storedBrief.content,
      source: (storedBrief.confidence ?? 0) >= 0.7 ? "ai" : "templated",
      confidence: storedBrief.confidence ?? 0.55,
      generatedAt: storedBrief.created_at,
    };
  } else {
    brief = {
      content: templatedBrief({
        campaignName: campaign.name,
        rangeDays,
        summary: summarize(rows),
        deltas: periodDeltas(rows, 7),
        platforms: summarizeByPlatform(rows),
        topCreatives: summarizeByCreative(rows, metaMap).slice(0, 3),
        anomalies: findings,
        recommendations,
      }),
      source: "templated",
      confidence: 0.55,
      generatedAt: new Date().toISOString(),
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All analytics
        </Link>
        <PageHeader
          title={campaign.name}
          description="Cross-platform performance, funnel and creative correlation, anomaly detection, and an AI daily brief feeding the Operator."
          actions={
            <div className="flex items-center gap-2">
              <BriefActions campaignId={campaignId} />
              <Link href={`/campaigns/${campaignId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Campaign hub
              </Link>
            </div>
          }
        />
      </div>

      <CampaignAnalytics
        campaignName={campaign.name}
        rows={rows}
        creativeMeta={creativeMeta}
        anomalies={anomalies}
        recommendations={recommendations}
        brief={brief}
        rangeDays={rangeDays}
      />
    </div>
  );
}
