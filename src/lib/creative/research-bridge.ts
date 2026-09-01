import { logger } from "@/lib/logger";
import { getResearchProjectWithReport, listResearchProjects } from "@/lib/research/service";

import { DEMO_CAMPAIGN_ID, DEMO_PAIN_POINTS, DEMO_VOCAB } from "./fixtures";

/**
 * READ-ONLY bridge from the Research Engine into the Creative Studio. When a
 * campaign has a research project with personas/pain points, we surface the exact
 * pain points and audience vocabulary so generated copy targets them directly.
 *
 * Never modifies research; degrades to empty context (or seeded demo context) so
 * generation always works.
 */

export interface ResearchCreativeContext {
  painPoints: string[];
  vocabulary: string[];
  personaName?: string;
  projectId?: string;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Resolves research-derived pain points + vocabulary for a campaign. */
export async function getResearchContextForCampaign(campaignId: string): Promise<ResearchCreativeContext> {
  // Demo campaign: use the seeded financial-newsletter intelligence directly.
  if (campaignId === DEMO_CAMPAIGN_ID) {
    return { painPoints: [...DEMO_PAIN_POINTS], vocabulary: [...DEMO_VOCAB] };
  }

  try {
    const projects = await listResearchProjects();
    const match =
      projects.find((p) => p.campaignId === campaignId && p.hasReport) ??
      projects.find((p) => p.campaignId === campaignId);
    if (!match) return { painPoints: [], vocabulary: [] };

    const { report } = await getResearchProjectWithReport(match.id);
    if (!report) return { painPoints: [], vocabulary: [], projectId: match.id };

    const painPoints = dedupe([
      ...report.painPoints.map((p) => p.summary),
      ...report.segments.flatMap((s) => s.psychographics.painPoints),
    ]).slice(0, 8);

    const vocabulary = dedupe([
      ...report.segments.flatMap((s) => [...s.psychographics.values, ...s.psychographics.interests]),
      ...report.trends.map((t) => t.topic),
    ]).slice(0, 16);

    return { painPoints, vocabulary, personaName: report.segments[0]?.name, projectId: match.id };
  } catch (error) {
    logger.warn("research bridge failed", { campaignId, error: String(error) });
    return { painPoints: [], vocabulary: [] };
  }
}
