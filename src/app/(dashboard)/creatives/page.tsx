import type { Metadata } from "next";

import { CreativeStudio } from "@/components/creative/creative-studio";
import { getServiceConfigStatus } from "@/lib/env";
import { DEMO_CAMPAIGN_ID, DEMO_CAMPAIGN_NAME } from "@/lib/creative/fixtures";
import { getResearchContextForCampaign } from "@/lib/creative/research-bridge";
import { getStudioData } from "@/lib/creative/studio";
import { campaignService } from "@/lib/services";

export const metadata: Metadata = { title: "Creatives" };

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
    // Campaign module is built in parallel; degrade to the demo campaign.
    return [demo];
  }
}

export default async function CreativesPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign } = await searchParams;
  const campaigns = await listCampaignOptions();
  const active = campaigns.find((c) => c.id === campaign) ?? campaigns[0];

  const config = getServiceConfigStatus();
  const [data, research] = await Promise.all([
    getStudioData(active.id),
    getResearchContextForCampaign(active.id),
  ]);

  return (
    <CreativeStudio
      key={active.id}
      campaignId={active.id}
      campaignName={active.name}
      campaigns={campaigns}
      azureConfigured={config.azure}
      defaultPainPoints={research.painPoints}
      initialCreatives={data.creatives}
      initialBrandVoices={data.brandVoices}
    />
  );
}
