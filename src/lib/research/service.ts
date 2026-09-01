import { logger } from "@/lib/logger";

import { runResearchPipeline } from "./orchestrator";
import {
  getResearchStore,
  type CreateProjectInput,
  type ResearchProjectRecord,
} from "./store";
import type { ProviderResult, QueryParams, ResearchReport } from "./standard-models";

// SERVER ONLY. The research application service: project lifecycle + running the
// pipeline + persistence, used by both server actions and the streaming API
// route so the two share one implementation.

export async function createResearchProject(input: CreateProjectInput): Promise<ResearchProjectRecord> {
  const store = await getResearchStore();
  return store.createProject(input);
}

export async function listResearchProjects(): Promise<ResearchProjectRecord[]> {
  const store = await getResearchStore();
  return store.listProjects();
}

export interface ProjectWithReport {
  project: ResearchProjectRecord | null;
  report: ResearchReport | null;
}

export async function getResearchProjectWithReport(id: string): Promise<ProjectWithReport> {
  const store = await getResearchStore();
  const project = await store.getProject(id);
  if (!project) return { project: null, report: null };
  const report = project.hasReport ? await store.getReport(id) : null;
  return { project, report };
}

export async function deleteResearchProject(id: string): Promise<void> {
  const store = await getResearchStore();
  await store.deleteProject(id);
}

export interface RunOptions {
  signal?: AbortSignal;
  onProviderResult?: (result: ProviderResult) => void;
}

/**
 * Runs the full pipeline for a project and persists the result. Persistence is
 * best-effort; the report is always returned so the UI renders even if the DB
 * write fails. The pipeline itself never throws (graceful degradation).
 */
export async function runResearchForProject(
  projectId: string,
  params: QueryParams,
  options: RunOptions = {},
): Promise<ResearchReport> {
  const store = await getResearchStore();
  await store.setStatus(projectId, "running").catch((error) => logger.warn("setStatus(running) failed", { error: String(error) }));

  const report = await runResearchPipeline(params, {
    signal: options.signal,
    onProviderResult: options.onProviderResult,
  });

  await store.saveReport(projectId, report).catch((error) => {
    logger.error("Persisting research report failed", error, { projectId });
  });

  return report;
}
