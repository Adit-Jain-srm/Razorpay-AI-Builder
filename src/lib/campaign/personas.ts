import { getResearchProjectWithReport, listResearchProjects } from "@/lib/research/service";
import type { AudienceSegment } from "@/lib/research/standard-models";

import { personaSnapshotSchema, type PersonaSnapshot } from "./brief";

/**
 * Research-first persona import. Reads the audience personas a research project
 * produced (via the read-only research service) and maps them into the lightweight
 * {@link PersonaSnapshot} the campaign brief stores. This is the "research first"
 * bridge - personas flow from the Audience Research Intelligence Engine straight
 * into the campaign brief, carrying their source project for traceability.
 *
 * SERVER ONLY (the research service resolves a request-scoped store). Read-only:
 * never writes to research; the snapshot is copied into the campaign brief.
 */

export interface ResearchProjectOption {
  id: string;
  name: string;
  query: string;
  status: string;
  hasReport: boolean;
}

/** Stable, deterministic snapshot id so re-importing the same persona dedupes. */
function snapshotId(projectId: string, name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${projectId}:${slug || "persona"}:${index}`;
}

/** Map a research `AudienceSegment` into a campaign-brief persona snapshot. */
export function segmentToSnapshot(segment: AudienceSegment, projectId: string, index: number): PersonaSnapshot {
  return personaSnapshotSchema.parse({
    id: snapshotId(projectId, segment.name, index),
    name: segment.name,
    summary: segment.psychographics.painPoints[0] ?? segment.psychographics.aspirations[0] ?? "",
    ageRange: segment.demographics.ageRange,
    incomeBracket: segment.demographics.incomeBracket,
    location: segment.demographics.location,
    painPoints: segment.psychographics.painPoints,
    platforms: segment.behaviors.platforms,
    sizeRange: segment.sizeEstimate.range,
    source: "research",
    researchProjectId: projectId,
  });
}

/** List research projects that can supply personas (most recent first). */
export async function listResearchProjectOptions(): Promise<ResearchProjectOption[]> {
  const projects = await listResearchProjects();
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    query: project.params.query,
    status: project.status,
    hasReport: project.hasReport,
  }));
}

/**
 * The personas available to import from a research project, as brief snapshots.
 * Returns `[]` when the project has no synthesized personas yet (never throws -
 * the research service degrades gracefully).
 */
export async function listImportablePersonas(projectId: string): Promise<PersonaSnapshot[]> {
  const { report } = await getResearchProjectWithReport(projectId);
  if (!report) return [];
  return report.segments.map((segment, index) => segmentToSnapshot(segment, projectId, index));
}
