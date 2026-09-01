import type { Metadata } from "next";

import { CampaignsList } from "@/components/campaign/campaigns-list";
import { PageHeader } from "@/components/layout/page-header";
import { decodeCampaign } from "@/lib/campaign/brief";
import { campaignService } from "@/lib/services";

export const metadata: Metadata = { title: "Campaigns" };

// The store is per-request (Supabase RLS or in-memory), so render dynamically.
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const rows = await campaignService.list();
  const campaigns = rows.map(decodeCampaign);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Campaigns"
        description="Every campaign is the hub linking research, creatives, landing pages, and analytics across its draft, active, and archived lifecycle."
      />
      <CampaignsList campaigns={campaigns} />
    </div>
  );
}
