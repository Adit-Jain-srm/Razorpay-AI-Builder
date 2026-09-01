import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CampaignHub } from "@/components/campaign/campaign-hub";
import { decodeCampaign } from "@/lib/campaign/brief";
import { campaignService } from "@/lib/services";

export const metadata: Metadata = { title: "Campaign hub" };

// Per-request store (Supabase RLS or in-memory) - never statically cache.
export const dynamic = "force-dynamic";

export default async function CampaignHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await campaignService.get(id);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <CampaignHub campaign={decodeCampaign(row)} />
    </div>
  );
}
