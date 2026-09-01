import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResearchWorkspace } from "@/components/research/research-workspace";
import { getResearchProjectWithReport } from "@/lib/research/service";

export const metadata: Metadata = { title: "Research workspace" };

// Per-request store (Supabase RLS or in-memory) - never statically cache.
export const dynamic = "force-dynamic";

export default async function ResearchProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, report } = await getResearchProjectWithReport(projectId);
  if (!project) notFound();

  return (
    <ResearchWorkspace
      projectId={project.id}
      projectName={project.name}
      params={project.params}
      initialReport={report}
    />
  );
}
