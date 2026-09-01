import type { Metadata } from "next";

import { LandingManager } from "@/components/landing-page/landing-manager";
import { getServiceConfigStatus } from "@/lib/env";
import { DEMO_CAMPAIGN_ID, DEMO_CAMPAIGN_NAME } from "@/lib/landing/fixtures";
import { getLandingHubData } from "@/lib/landing/studio";
import { campaignService } from "@/lib/services";

export const metadata: Metadata = { title: "Landing Pages" };

// Per-request store (Supabase RLS or seeded in-memory) - never statically cache.
export const dynamic = "force-dynamic";

/** Campaign options: real campaigns when available, else the seeded demo campaign. */
async function listCampaignOptions(): Promise<{ id: string; name: string }[]> {
  const demo = { id: DEMO_CAMPAIGN_ID, name: DEMO_CAMPAIGN_NAME };
  try {
    const campaigns = await campaignService.list();
    const options = campaigns.map((c) => ({ id: c.id, name: c.name }));
    return options.length > 0 ? options : [demo];
  } catch {
    return [demo];
  }
}

export default async function LandingPagesPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign } = await searchParams;
  const campaigns = await listCampaignOptions();
  const active = campaigns.find((c) => c.id === campaign) ?? campaigns[0];

  const config = getServiceConfigStatus();
  const data = await getLandingHubData(active.id);

  return (
    <LandingManager
      key={active.id}
      campaignId={active.id}
      campaignName={active.name}
      campaigns={campaigns}
      azureConfigured={config.azure}
      initialData={data}
    />
  );
}
