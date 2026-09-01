import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ResearchList, type ResearchProjectSummary } from "@/components/research/research-list";
import { listResearchProjects } from "@/lib/research/service";

export const metadata: Metadata = { title: "Research" };

// The store is per-request (Supabase RLS or in-memory), so render dynamically.
export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const projects = await listResearchProjects();
  const summaries: ResearchProjectSummary[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    query: project.params.query,
    status: project.status,
    createdAt: project.createdAt,
    hasReport: project.hasReport,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Research"
        description="The audience research intelligence engine: competitor ads, search intent, community pain points, news, and social, aggregated and synthesized into cited personas."
      />
      <ResearchList projects={summaries} />
    </div>
  );
}
