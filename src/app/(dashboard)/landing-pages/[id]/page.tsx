import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingEditor } from "@/components/landing-page/landing-editor";
import { getServiceConfigStatus } from "@/lib/env";
import { DEMO_CAMPAIGN_ID, DEMO_CAMPAIGN_NAME } from "@/lib/landing/fixtures";
import { getLandingPageView } from "@/lib/landing/studio";
import { campaignService } from "@/lib/services";

export const metadata: Metadata = { title: "Edit landing page" };

// Per-request store (Supabase RLS or seeded in-memory) - never statically cache.
export const dynamic = "force-dynamic";

async function campaignName(campaignId: string): Promise<string> {
  if (campaignId === DEMO_CAMPAIGN_ID) return DEMO_CAMPAIGN_NAME;
  try {
    const campaign = await campaignService.get(campaignId);
    return campaign?.name ?? "Campaign";
  } catch {
    return "Campaign";
  }
}

export default async function LandingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await getLandingPageView(id);
  if (!page) notFound();

  const [name, config] = await Promise.all([campaignName(page.campaignId), Promise.resolve(getServiceConfigStatus())]);

  return <LandingEditor initialPage={page} campaignName={name} azureConfigured={config.azure} />;
}
