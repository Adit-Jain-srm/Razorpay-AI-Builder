import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, ResearchProjectRow } from "@/types/database";

import { buildSeededReport, DEFAULT_SEED_QUERY } from "./fixtures";
import {
  audienceSegmentSchema,
  competitorAdSchema,
  communityInsightSchema,
  queryParamsSchema,
  researchReportSchema,
  trendSignalSchema,
  type QueryParams,
  type ResearchReport,
} from "./standard-models";

// SERVER ONLY. Persists research projects + reports. Uses Supabase (RLS-scoped to
// the signed-in user) when configured, and degrades to an in-memory store so the
// engine fully works with zero credentials (demo-safe). Persistence is always
// best-effort: a write failure logs and degrades, never throws to the UI.

export type ResearchProjectStatus = "draft" | "running" | "complete" | "error";

export interface ResearchProjectRecord {
  id: string;
  name: string;
  params: QueryParams;
  status: ResearchProjectStatus;
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
  hasReport: boolean;
}

export interface CreateProjectInput {
  name: string;
  params: QueryParams;
  campaignId?: string | null;
}

export interface ResearchStore {
  createProject(input: CreateProjectInput): Promise<ResearchProjectRecord>;
  listProjects(): Promise<ResearchProjectRecord[]>;
  getProject(id: string): Promise<ResearchProjectRecord | null>;
  setStatus(id: string, status: ResearchProjectStatus): Promise<void>;
  saveReport(projectId: string, report: ResearchReport): Promise<void>;
  getReport(projectId: string): Promise<ResearchReport | null>;
  deleteProject(id: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `proj_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

/** Params are stored in the `query` text column as JSON so re-runs keep context. */
function serializeParams(params: QueryParams): string {
  return JSON.stringify(params);
}

function parseParams(raw: string): QueryParams {
  try {
    const parsed = queryParamsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Not JSON - treat the column as a plain free-text query.
  }
  return { query: raw || DEFAULT_SEED_QUERY.query };
}

function statusOf(value: string): ResearchProjectStatus {
  return value === "running" || value === "complete" || value === "error" ? value : "draft";
}

/* -------------------------------------------------------------------------- */
/* In-memory store (credential-free demo + tests)                             */
/* -------------------------------------------------------------------------- */

import {
  DEMO_CAMPAIGN_ID,
  DEMO_RESEARCH_PROJECT_ID,
} from "@/lib/seed/constants";

class InMemoryResearchStore implements ResearchStore {
  private readonly projects = new Map<string, ResearchProjectRecord>();
  private readonly reports = new Map<string, ResearchReport>();
  private seeded = false;

  private ensureSeed(): void {
    if (this.seeded) return;
    this.seeded = true;
    const now = new Date().toISOString();
    const id = DEMO_RESEARCH_PROJECT_ID;
    this.projects.set(id, {
      id,
      name: "Retirement Income Weekly",
      params: DEFAULT_SEED_QUERY,
      status: "complete",
      campaignId: DEMO_CAMPAIGN_ID,
      createdAt: now,
      updatedAt: now,
      hasReport: true,
    });
    this.reports.set(id, buildSeededReport(DEFAULT_SEED_QUERY));
  }

  async createProject(input: CreateProjectInput): Promise<ResearchProjectRecord> {
    this.ensureSeed();
    const now = new Date().toISOString();
    const record: ResearchProjectRecord = {
      id: randomId(),
      name: input.name,
      params: input.params,
      status: "draft",
      campaignId: input.campaignId ?? null,
      createdAt: now,
      updatedAt: now,
      hasReport: false,
    };
    this.projects.set(record.id, record);
    return record;
  }

  async listProjects(): Promise<ResearchProjectRecord[]> {
    this.ensureSeed();
    return [...this.projects.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<ResearchProjectRecord | null> {
    this.ensureSeed();
    return this.projects.get(id) ?? null;
  }

  async setStatus(id: string, status: ResearchProjectStatus): Promise<void> {
    const record = this.projects.get(id);
    if (record) this.projects.set(id, { ...record, status, updatedAt: new Date().toISOString() });
  }

  async saveReport(projectId: string, report: ResearchReport): Promise<void> {
    this.reports.set(projectId, report);
    const record = this.projects.get(projectId);
    if (record) {
      this.projects.set(projectId, { ...record, status: "complete", hasReport: true, updatedAt: new Date().toISOString() });
    }
  }

  async getReport(projectId: string): Promise<ResearchReport | null> {
    this.ensureSeed();
    return this.reports.get(projectId) ?? null;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    this.reports.delete(id);
  }
}

/** Process-wide singleton so projects persist across requests in dev/demo. */
const memoryStore = new InMemoryResearchStore();

/* -------------------------------------------------------------------------- */
/* Supabase store (RLS-scoped)                                                */
/* -------------------------------------------------------------------------- */

const SNAPSHOT_PROVIDER = "_snapshot";

class SupabaseResearchStore implements ResearchStore {
  private readonly db: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>, private readonly userId: string) {
    this.db = supabase;
  }

  async createProject(input: CreateProjectInput): Promise<ResearchProjectRecord> {
    const { data, error } = await this.db
      .from("research_projects")
      .insert({
        user_id: this.userId,
        name: input.name,
        query: serializeParams(input.params),
        status: "draft",
        campaign_id: input.campaignId ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to create research project");
    return this.toRecord(data, false);
  }

  async listProjects(): Promise<ResearchProjectRecord[]> {
    const { data, error } = await this.db
      .from("research_projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => this.toRecord(row, row.status === "complete"));
  }

  async getProject(id: string): Promise<ResearchProjectRecord | null> {
    const { data, error } = await this.db.from("research_projects").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return this.toRecord(data, data.status === "complete");
  }

  async setStatus(id: string, status: ResearchProjectStatus): Promise<void> {
    await this.db
      .from("research_projects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async saveReport(projectId: string, report: ResearchReport): Promise<void> {
    const uid = this.userId;
    // Idempotent re-run: clear prior child rows.
    await Promise.all([
      this.db.from("audience_personas").delete().eq("project_id", projectId),
      this.db.from("competitor_ads").delete().eq("project_id", projectId),
      this.db.from("trend_signals").delete().eq("project_id", projectId),
      this.db.from("community_insights").delete().eq("project_id", projectId),
      this.db.from("research_sources").delete().eq("project_id", projectId),
    ]);

    const inserts: Promise<unknown>[] = [];

    if (report.segments.length) {
      inserts.push(
        Promise.resolve(
          this.db.from("audience_personas").insert(
            report.segments.map((p) => ({
              project_id: projectId,
              user_id: uid,
              name: p.name,
              demographics: toJson(p.demographics),
              psychographics: toJson(p.psychographics),
              behaviors: toJson(p.behaviors),
              pain_points: toJson(p.psychographics.painPoints),
              buying_triggers: toJson([]),
              size_estimate: toJson(p.sizeEstimate),
              confidence: p.sizeEstimate.confidence ?? null,
              sources: toJson(p.sources),
            })),
          ),
        ),
      );
    }

    if (report.competitorAds.length) {
      inserts.push(
        Promise.resolve(
          this.db.from("competitor_ads").insert(
            report.competitorAds.map((a) => ({
              project_id: projectId,
              user_id: uid,
              platform: a.platform,
              advertiser: a.advertiser ?? null,
              creative_type: a.creativeType ?? null,
              copy: a.copy ?? null,
              hooks: toJson(a.hooksUsed),
              estimated_spend: a.estimatedSpend ?? null,
              date_range: a.dateRange ?? null,
              image_url: a.imageUrl ?? null,
            })),
          ),
        ),
      );
    }

    if (report.trends.length) {
      inserts.push(
        Promise.resolve(
          this.db.from("trend_signals").insert(
            report.trends.map((t) => ({
              project_id: projectId,
              user_id: uid,
              topic: t.topic,
              velocity: t.velocity ?? null,
              volume: t.volume ?? null,
              sentiment: t.sentiment ?? null,
              source: t.source ?? null,
              time_series: toJson(t.timeSeries),
            })),
          ),
        ),
      );
    }

    if (report.communityInsights.length) {
      inserts.push(
        Promise.resolve(
          this.db.from("community_insights").insert(
            report.communityInsights.map((c) => ({
              project_id: projectId,
              user_id: uid,
              source_url: c.sourceUrl ?? null,
              platform: c.platform ?? null,
              content: c.content,
              pain_point_extracted: c.painPointExtracted ?? null,
              sentiment: c.sentiment ?? null,
              upvotes: c.upvotes ?? null,
              posted_at: c.postedAt ?? null,
            })),
          ),
        ),
      );
    }

    // Citations + a lossless snapshot row so a reload restores the full report.
    const sourceRows = report.sources.map((s) => ({
      project_id: projectId,
      user_id: uid,
      provider: s.provider,
      url: s.url ?? null,
      title: s.title ?? null,
      fetched_at: s.fetchedAt ?? new Date().toISOString(),
      raw_data: toJson(s),
      confidence: s.confidence ?? null,
    }));
    sourceRows.push({
      project_id: projectId,
      user_id: uid,
      provider: SNAPSHOT_PROVIDER,
      url: null,
      title: "report-snapshot",
      fetched_at: new Date().toISOString(),
      raw_data: toJson(report),
      confidence: null,
    });
    inserts.push(Promise.resolve(this.db.from("research_sources").insert(sourceRows)));

    inserts.push(
      Promise.resolve(
        this.db
          .from("research_projects")
          .update({ status: "complete", updated_at: new Date().toISOString() })
          .eq("id", projectId),
      ),
    );

    await Promise.all(inserts);
  }

  async getReport(projectId: string): Promise<ResearchReport | null> {
    // Prefer the lossless snapshot.
    const { data: snapshot } = await this.db
      .from("research_sources")
      .select("raw_data")
      .eq("project_id", projectId)
      .eq("provider", SNAPSHOT_PROVIDER)
      .maybeSingle();
    if (snapshot?.raw_data) {
      const parsed = researchReportSchema.safeParse(snapshot.raw_data);
      if (parsed.success) return parsed.data;
    }
    return this.reconstructReport(projectId);
  }

  /** Best-effort reconstruction from normalized rows when no snapshot exists. */
  private async reconstructReport(projectId: string): Promise<ResearchReport | null> {
    const project = await this.getProject(projectId);
    if (!project) return null;

    const [personas, ads, trends, community, sources] = await Promise.all([
      this.db.from("audience_personas").select("*").eq("project_id", projectId),
      this.db.from("competitor_ads").select("*").eq("project_id", projectId),
      this.db.from("trend_signals").select("*").eq("project_id", projectId),
      this.db.from("community_insights").select("*").eq("project_id", projectId),
      this.db.from("research_sources").select("*").eq("project_id", projectId).neq("provider", SNAPSHOT_PROVIDER),
    ]);

    const segments = (personas.data ?? [])
      .map((row) =>
        audienceSegmentSchema.safeParse({
          name: row.name,
          demographics: row.demographics,
          psychographics: row.psychographics,
          behaviors: row.behaviors,
          sizeEstimate: row.size_estimate,
          sources: row.sources,
        }),
      )
      .flatMap((r) => (r.success ? [r.data] : []));

    const competitorAds = (ads.data ?? [])
      .map((row) =>
        competitorAdSchema.safeParse({
          platform: row.platform,
          advertiser: row.advertiser ?? undefined,
          creativeType: row.creative_type ?? undefined,
          copy: row.copy ?? undefined,
          hooksUsed: row.hooks,
          estimatedSpend: row.estimated_spend ?? undefined,
          dateRange: row.date_range ?? undefined,
          imageUrl: row.image_url ?? undefined,
        }),
      )
      .flatMap((r) => (r.success ? [r.data] : []));

    const reportTrends = (trends.data ?? [])
      .map((row) =>
        trendSignalSchema.safeParse({
          topic: row.topic,
          velocity: row.velocity ?? undefined,
          volume: row.volume ?? undefined,
          sentiment: row.sentiment ?? undefined,
          source: row.source ?? undefined,
          timeSeries: row.time_series,
        }),
      )
      .flatMap((r) => (r.success ? [r.data] : []));

    const communityInsights = (community.data ?? [])
      .map((row) =>
        communityInsightSchema.safeParse({
          sourceUrl: row.source_url ?? undefined,
          platform: row.platform ?? undefined,
          content: row.content,
          painPointExtracted: row.pain_point_extracted ?? undefined,
          sentiment: row.sentiment ?? undefined,
          upvotes: row.upvotes ?? undefined,
          postedAt: row.posted_at ?? undefined,
        }),
      )
      .flatMap((r) => (r.success ? [r.data] : []));

    return researchReportSchema.parse({
      query: project.params,
      segments,
      competitorAds,
      trends: reportTrends,
      communityInsights,
      painPoints: [],
      buyingTriggers: [],
      opportunities: [],
      sources: (sources.data ?? []).map((row) => ({
        provider: row.provider,
        url: row.url ?? undefined,
        title: row.title ?? undefined,
        fetchedAt: row.fetched_at,
        confidence: row.confidence ?? undefined,
      })),
      generatedAt: project.updatedAt,
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.from("research_projects").delete().eq("id", id);
  }

  private toRecord(row: ResearchProjectRow, hasReport: boolean): ResearchProjectRecord {
    return {
      id: row.id,
      name: row.name,
      params: parseParams(row.query),
      status: statusOf(row.status),
      campaignId: row.campaign_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hasReport,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Store resolution                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the best available store. Uses Supabase (RLS) when configured and a
 * user is signed in; otherwise the in-memory store so the engine works with zero
 * credentials. Never throws - it always returns a usable store.
 */
export async function getResearchStore(): Promise<ResearchStore> {
  if (!isSupabaseConfigured()) return memoryStore;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return memoryStore;
    return new SupabaseResearchStore(supabase, user.id);
  } catch (error) {
    logger.warn("Falling back to in-memory research store", { error: String(error) });
    return memoryStore;
  }
}

/** Exposed for tests. */
export { InMemoryResearchStore };
