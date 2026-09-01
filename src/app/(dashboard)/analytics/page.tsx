import type { Metadata } from "next";

import { summarize } from "@/lib/analytics";
import { coerceStatus } from "@/lib/campaign/brief";
import { analyticsService, campaignService } from "@/lib/services";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsOverview, type CampaignAnalyticsRow } from "@/components/analytics/analytics-overview";
import { SeedAnalyticsButton } from "@/components/analytics/analytics-actions";

export const metadata: Metadata = { title: "Analytics" };

// Per-request store (Supabase RLS or seeded in-memory) - render dynamically.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [campaigns, allMetrics] = await Promise.all([campaignService.list(), analyticsService.metrics({})]);

  const portfolio = summarize(allMetrics);
  const rows: CampaignAnalyticsRow[] = campaigns.map((campaign) => {
    const campaignMetrics = allMetrics.filter((m) => m.campaign_id === campaign.id);
    return {
      id: campaign.id,
      name: campaign.name,
      status: coerceStatus(campaign.status),
      summary: summarize(campaignMetrics),
      hasData: campaignMetrics.length > 0,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Analytics"
        description="Cross-platform performance, funnel and creative correlation, and an AI daily brief with anomaly detection feeding the Operator."
        actions={<SeedAnalyticsButton />}
      />
      <AnalyticsOverview portfolio={portfolio} campaigns={rows} />
    </div>
  );
}
