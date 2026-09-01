import type { Metadata } from "next";

import { BriefBuilder } from "@/components/campaign/brief-builder";
import { PageHeader } from "@/components/layout/page-header";
import { applyTemplate } from "@/lib/campaign/templates";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; research?: string }>;
}) {
  const { template, research } = await searchParams;
  const seed = template ? applyTemplate(template) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="New campaign"
        description="Build a research-powered brief with inline AI: import cited personas, get platform recommendations, and allocate budget."
      />
      <BriefBuilder initialSeed={seed} initialResearchProjectId={research} />
    </div>
  );
}
