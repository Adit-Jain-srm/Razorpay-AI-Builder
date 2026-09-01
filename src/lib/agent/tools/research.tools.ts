import { z } from "zod";

import { runResearchPipeline } from "@/lib/research/orchestrator";
import { getResearchProjectWithReport, listResearchProjects } from "@/lib/research/service";
import type {
  AudienceSegment,
  ResearchReport,
  SourceCitation,
} from "@/lib/research/standard-models";

import { defineTool, type AgentTool } from "../types";
import type {
  PersonasArtifactData,
  ResearchPersonaCard,
  ResearchReportArtifactData,
  ResearchSourceLink,
} from "./artifacts";
import { MODULE_TOOL_CATEGORY, ok, runToolSafely } from "./shared";

/**
 * Research tools - the Operator's window into the Audience Research Intelligence
 * Engine (the moat). `research_audience` runs the full pipeline (live Bright Data
 * -> seeded fixtures) and returns citation-rich personas, pain points, competitor
 * angles, and opportunities; `get_personas` reads a saved project's personas.
 */

const MAX_SOURCES = 8;

function segmentToCard(segment: AudienceSegment): ResearchPersonaCard {
  return {
    name: segment.name,
    summary: segment.psychographics.painPoints[0] ?? segment.psychographics.aspirations[0] ?? "",
    ageRange: segment.demographics.ageRange,
    incomeBracket: segment.demographics.incomeBracket,
    location: segment.demographics.location,
    painPoints: segment.psychographics.painPoints.slice(0, 6),
    platforms: segment.behaviors.platforms.slice(0, 6),
    sizeRange: segment.sizeEstimate.range,
  };
}

/** Dedupe citations by URL (or provider+title) and keep the most useful first. */
function topSources(sources: SourceCitation[]): ResearchSourceLink[] {
  const seen = new Set<string>();
  const out: ResearchSourceLink[] = [];
  for (const source of sources) {
    const key = source.url ?? `${source.provider}:${source.title ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ provider: source.provider, title: source.title, url: source.url });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

function reportToArtifactData(report: ResearchReport): ResearchReportArtifactData {
  return {
    query: report.query.query,
    personas: report.segments.slice(0, 4).map(segmentToCard),
    painPoints: report.painPoints.slice(0, 6).map((point) => ({ summary: point.summary, quote: point.quote })),
    competitorAngles: report.competitorAds.slice(0, 5).map((ad) => ({
      advertiser: ad.advertiser,
      platform: ad.platform,
      hooks: ad.hooksUsed.slice(0, 4),
      copy: ad.copy,
    })),
    opportunities: report.opportunities.slice(0, 4).map((opp) => ({
      title: opp.title,
      type: opp.type,
      rationale: opp.rationale,
    })),
    sources: topSources(report.sources),
    sourceCount: report.sources.length,
    providerRuns: report.providerRuns.map((run) => ({
      provider: run.provider,
      status: run.status,
      itemCount: run.itemCount,
    })),
  };
}

export function createResearchTools(): AgentTool[] {
  const researchAudience = defineTool<
    { query: string; industry?: string; product?: string; region?: string; limit?: number },
    ResearchReportArtifactData
  >({
    name: "research_audience",
    description:
      "Run the Audience Research Intelligence Engine for a query or vertical. Aggregates live web data (search intent, communities, competitor ads, news) into synthesized personas, ranked pain points (the audience's own words), competitor angles, opportunities, and source citations. This is the FIRST step of any campaign - ground everything downstream in its output and cite its sources.",
    category: MODULE_TOOL_CATEGORY.research,
    parameters: z.object({
      query: z
        .string()
        .min(2)
        .max(300)
        .describe("The audience or topic to research, e.g. 'near-retirees worried about inflation'"),
      industry: z.string().max(120).optional().describe("Optional industry/vertical hint, e.g. 'financial newsletters'"),
      product: z.string().max(200).optional().describe("Optional product/offer being advertised"),
      region: z.string().max(8).optional().describe("ISO region hint, e.g. 'us' (default us)"),
      limit: z.number().int().min(5).max(50).optional().describe("Max items per provider (default 25)"),
    }),
    execute: async (params) =>
      runToolSafely("research_audience", async () => {
        const report = await runResearchPipeline({
          query: params.query,
          industry: params.industry,
          product: params.product,
          region: params.region ?? "us",
          limit: params.limit ?? 25,
        });
        const data = reportToArtifactData(report);
        return ok(data, {
          type: "research-report",
          title: `Audience research: ${params.query}`,
          data,
        });
      }),
  });

  const getPersonas = defineTool<{ projectId?: string }, PersonasArtifactData>({
    name: "get_personas",
    description:
      "Read the synthesized audience personas from a saved research project. Omit projectId to use the most recent project that has a report. Use this to reuse prior research instead of re-running the engine.",
    category: MODULE_TOOL_CATEGORY.research,
    parameters: z.object({
      projectId: z.string().max(100).optional().describe("Research project id; omit for the most recent report"),
    }),
    execute: async (params) =>
      runToolSafely("get_personas", async () => {
        const projects = await listResearchProjects();
        const target = params.projectId
          ? projects.find((project) => project.id === params.projectId)
          : (projects.find((project) => project.hasReport) ?? projects[0]);

        if (!target) {
          return { ok: false, error: "No research projects found yet. Run research_audience first." };
        }

        const { report } = await getResearchProjectWithReport(target.id);
        if (!report) {
          return { ok: false, error: `Project "${target.name}" has no synthesized report yet. Run research first.` };
        }

        const data: PersonasArtifactData = {
          projectId: target.id,
          projectName: target.name,
          personas: report.segments.map(segmentToCard),
        };
        return ok(data, { type: "personas", title: `Personas: ${target.name}`, data });
      }),
  });

  return [researchAudience, getPersonas];
}
