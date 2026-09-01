import type { SupabaseClient } from "@supabase/supabase-js";

import { detectCampaignAnomalies, summarize, toAnomalyInserts } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { generateMetrics, type MetricSeed } from "@/lib/seed/analytics-generator";
import { buildDemoSeedTargets } from "@/lib/seed/targets";
import type {
  AiInsight,
  AiInsightInsert,
  Anomaly,
  AnomalyInsert,
  Database,
  PerformanceMetric,
  PerformanceMetricInsert,
} from "@/types/database";

export interface AnalyticsQuery {
  campaignId?: string;
  creativeId?: string;
  platform?: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  from?: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  to?: string;
}

/** Roll-up across the queried metric rows. */
export interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

/**
 * Performance metrics, anomalies, and AI insights access.
 *
 * Uses Supabase (RLS-scoped to the signed-in user) when configured, and degrades
 * to a SEEDED in-memory store - 90 days of realistic, deterministic multi-platform
 * data - so Performance Intelligence is fully demoable with zero credentials.
 * The seeder (`@/lib/seed`) writes via `insertMetrics`; reads degrade gracefully,
 * writes throw typed `AppError`s.
 *
 * SERVER ONLY: imports the cookie-bound Supabase client. Never import from a
 * Client Component - fetch server-side and pass plain data down.
 */
export interface AnalyticsService {
  metrics(query: AnalyticsQuery): Promise<PerformanceMetric[]>;
  summary(query: AnalyticsQuery): Promise<AnalyticsSummary>;
  insertMetrics(rows: PerformanceMetricInsert[]): Promise<number>;
  anomalies(campaignId: string): Promise<Anomaly[]>;
  insights(campaignId: string): Promise<AiInsight[]>;
  /** Persist detected anomalies (store adds `user_id`). Returns count written. */
  insertAnomalies(rows: Array<Omit<AnomalyInsert, "user_id">>): Promise<number>;
  /** Persist a single AI insight (store adds `user_id`). */
  insertInsight(row: Omit<AiInsightInsert, "user_id">): Promise<AiInsight>;
  /** Mark an anomaly resolved (`resolved_at = now`). */
  resolveAnomaly(id: string): Promise<void>;
  /** Toggle an insight's `actioned` flag. */
  markInsightActioned(id: string, actioned: boolean): Promise<void>;
}

/** The per-request store, bound to the resolved user. */
export interface AnalyticsStore extends AnalyticsService {
  readonly userId: string;
}

import { DEMO_USER_ID } from "@/lib/seed/constants";

const DEMO_ANALYTICS_USER_ID = DEMO_USER_ID;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(prefix = "pm"): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function matchesQuery(row: PerformanceMetric, query: AnalyticsQuery): boolean {
  if (query.campaignId && row.campaign_id !== query.campaignId) return false;
  if (query.creativeId && row.creative_id !== query.creativeId) return false;
  if (query.platform && row.platform !== query.platform) return false;
  const date = row.date.slice(0, 10);
  if (query.from && date < query.from) return false;
  if (query.to && date > query.to) return false;
  return true;
}

/** Materialize a generator seed (or public insert) into a full row. */
function toMetricRow(seed: MetricSeed | PerformanceMetricInsert, userId: string): PerformanceMetric {
  const now = new Date().toISOString();
  return {
    id: seed.id ?? randomId(),
    campaign_id: seed.campaign_id,
    creative_id: seed.creative_id ?? null,
    user_id: userId,
    platform: seed.platform,
    date: seed.date,
    impressions: seed.impressions ?? 0,
    clicks: seed.clicks ?? 0,
    conversions: seed.conversions ?? 0,
    spend: seed.spend ?? 0,
    revenue: seed.revenue ?? 0,
    cpa: seed.cpa ?? null,
    ctr: seed.ctr ?? null,
    cvr: seed.cvr ?? null,
    roas: seed.roas ?? null,
    created_at: seed.created_at ?? now,
  };
}

/* -------------------------------------------------------------------------- */
/* In-memory store (seeded, credential-free demo + tests)                     */
/* -------------------------------------------------------------------------- */

export class InMemoryAnalyticsStore implements AnalyticsStore {
  readonly userId = DEMO_ANALYTICS_USER_ID;
  private readonly metricsById = new Map<string, PerformanceMetric>();
  private readonly anomaliesById = new Map<string, Anomaly>();
  private readonly insightsById = new Map<string, AiInsight>();
  private seeded = false;

  /** @param seedDemo seed 90 days of demo data on first access (default true). */
  constructor(private readonly seedDemo = true) {}

  private ensureSeed(): void {
    if (this.seeded) return;
    this.seeded = true;
    if (!this.seedDemo) return;

    const target = buildDemoSeedTargets();
    const endDate = new Date().toISOString().slice(0, 10);
    const { metrics } = generateMetrics(target, { days: 90, endDate, seed: target.campaignId });
    for (const seed of metrics) {
      const row = toMetricRow(seed, this.userId);
      this.metricsById.set(row.id, row);
    }

    // Detect + persist anomalies so the feed renders without an explicit run.
    const findings = detectCampaignAnomalies([...this.metricsById.values()]);
    const now = new Date().toISOString();
    for (const insert of toAnomalyInserts(findings, target.campaignId)) {
      const id = randomId("an");
      this.anomaliesById.set(id, {
        id,
        campaign_id: insert.campaign_id,
        user_id: this.userId,
        metric: insert.metric,
        severity: insert.severity ?? "low",
        description: insert.description ?? null,
        detected_at: insert.detected_at ?? now,
        resolved_at: insert.resolved_at ?? null,
        created_at: now,
      });
    }
  }

  async metrics(query: AnalyticsQuery): Promise<PerformanceMetric[]> {
    this.ensureSeed();
    return [...this.metricsById.values()]
      .filter((row) => matchesQuery(row, query))
      .sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform));
  }

  async summary(query: AnalyticsQuery): Promise<AnalyticsSummary> {
    return summarize(await this.metrics(query));
  }

  async insertMetrics(rows: PerformanceMetricInsert[]): Promise<number> {
    this.ensureSeed();
    for (const insert of rows) {
      const row = toMetricRow(insert, this.userId);
      this.metricsById.set(row.id, row);
    }
    return rows.length;
  }

  async anomalies(campaignId: string): Promise<Anomaly[]> {
    this.ensureSeed();
    return [...this.anomaliesById.values()]
      .filter((row) => row.campaign_id === campaignId)
      .sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  }

  async insights(campaignId: string): Promise<AiInsight[]> {
    this.ensureSeed();
    return [...this.insightsById.values()]
      .filter((row) => row.campaign_id === campaignId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async insertAnomalies(rows: Array<Omit<AnomalyInsert, "user_id">>): Promise<number> {
    this.ensureSeed();
    const now = new Date().toISOString();
    for (const insert of rows) {
      const id = insert.id ?? randomId("an");
      this.anomaliesById.set(id, {
        id,
        campaign_id: insert.campaign_id,
        user_id: this.userId,
        metric: insert.metric,
        severity: insert.severity ?? "low",
        description: insert.description ?? null,
        detected_at: insert.detected_at ?? now,
        resolved_at: insert.resolved_at ?? null,
        created_at: insert.created_at ?? now,
      });
    }
    return rows.length;
  }

  async insertInsight(insert: Omit<AiInsightInsert, "user_id">): Promise<AiInsight> {
    this.ensureSeed();
    const now = new Date().toISOString();
    const row: AiInsight = {
      id: insert.id ?? randomId("ai"),
      campaign_id: insert.campaign_id,
      user_id: this.userId,
      type: insert.type,
      content: insert.content,
      confidence: insert.confidence ?? null,
      actioned: insert.actioned ?? false,
      created_at: insert.created_at ?? now,
    };
    this.insightsById.set(row.id, row);
    return row;
  }

  async resolveAnomaly(id: string): Promise<void> {
    const existing = this.anomaliesById.get(id);
    if (existing) this.anomaliesById.set(id, { ...existing, resolved_at: new Date().toISOString() });
  }

  async markInsightActioned(id: string, actioned: boolean): Promise<void> {
    const existing = this.insightsById.get(id);
    if (existing) this.insightsById.set(id, { ...existing, actioned });
  }
}

/** Process-wide singleton so seeded demo data persists across requests. */
const memoryStore = new InMemoryAnalyticsStore();

/* -------------------------------------------------------------------------- */
/* Supabase store (RLS-scoped)                                                */
/* -------------------------------------------------------------------------- */

const INSERT_CHUNK = 500;

export class SupabaseAnalyticsStore implements AnalyticsStore {
  constructor(
    private readonly db: SupabaseClient<Database>,
    readonly userId: string,
  ) {}

  async metrics(query: AnalyticsQuery): Promise<PerformanceMetric[]> {
    try {
      let builder = this.db.from("performance_metrics").select("*");
      if (query.campaignId) builder = builder.eq("campaign_id", query.campaignId);
      if (query.creativeId) builder = builder.eq("creative_id", query.creativeId);
      if (query.platform) builder = builder.eq("platform", query.platform);
      if (query.from) builder = builder.gte("date", query.from);
      if (query.to) builder = builder.lte("date", query.to);
      const { data, error } = await builder.order("date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      logger.error("analytics.store metrics failed", error);
      return [];
    }
  }

  async summary(query: AnalyticsQuery): Promise<AnalyticsSummary> {
    return summarize(await this.metrics(query));
  }

  async insertMetrics(rows: PerformanceMetricInsert[]): Promise<number> {
    if (rows.length === 0) return 0;
    let written = 0;
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const chunk = rows.slice(i, i + INSERT_CHUNK).map((row) => ({ ...row, user_id: this.userId }));
      const { error, count } = await this.db
        .from("performance_metrics")
        .insert(chunk, { count: "exact" });
      if (error) throw new UpstreamError("Failed to insert performance metrics", { service: "supabase", cause: error });
      written += count ?? chunk.length;
    }
    return written;
  }

  async anomalies(campaignId: string): Promise<Anomaly[]> {
    try {
      const { data, error } = await this.db
        .from("anomalies")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      logger.error("analytics.store anomalies failed", error, { campaignId });
      return [];
    }
  }

  async insights(campaignId: string): Promise<AiInsight[]> {
    try {
      const { data, error } = await this.db
        .from("ai_insights")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      logger.error("analytics.store insights failed", error, { campaignId });
      return [];
    }
  }

  async insertAnomalies(rows: Array<Omit<AnomalyInsert, "user_id">>): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((row) => ({ ...row, user_id: this.userId }));
    const { error, count } = await this.db.from("anomalies").insert(payload, { count: "exact" });
    if (error) throw new UpstreamError("Failed to insert anomalies", { service: "supabase", cause: error });
    return count ?? payload.length;
  }

  async insertInsight(insert: Omit<AiInsightInsert, "user_id">): Promise<AiInsight> {
    const { data, error } = await this.db
      .from("ai_insights")
      .insert({ ...insert, user_id: this.userId })
      .select()
      .single();
    if (error || !data) throw new UpstreamError("Failed to insert AI insight", { service: "supabase", cause: error });
    return data;
  }

  async resolveAnomaly(id: string): Promise<void> {
    const { error } = await this.db
      .from("anomalies")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new UpstreamError("Failed to resolve anomaly", { service: "supabase", cause: error });
  }

  async markInsightActioned(id: string, actioned: boolean): Promise<void> {
    const { error } = await this.db.from("ai_insights").update({ actioned }).eq("id", id);
    if (error) throw new UpstreamError("Failed to update insight", { service: "supabase", cause: error });
  }
}

/* -------------------------------------------------------------------------- */
/* Store resolution + public service                                          */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the best store: Supabase (RLS) when configured and a user is signed
 * in, otherwise the seeded in-memory store. Never throws - always returns a
 * usable store so the dashboard renders with zero credentials.
 */
export async function getAnalyticsStore(): Promise<AnalyticsStore> {
  if (!isSupabaseConfigured()) return memoryStore;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return memoryStore;
    return new SupabaseAnalyticsStore(supabase, user.id);
  } catch (error) {
    logger.warn("Falling back to in-memory analytics store", { error: String(error) });
    return memoryStore;
  }
}

export const analyticsService: AnalyticsService = {
  async metrics(query) {
    return (await getAnalyticsStore()).metrics(query);
  },
  async summary(query) {
    return (await getAnalyticsStore()).summary(query);
  },
  async insertMetrics(rows) {
    return (await getAnalyticsStore()).insertMetrics(rows);
  },
  async anomalies(campaignId) {
    return (await getAnalyticsStore()).anomalies(campaignId);
  },
  async insights(campaignId) {
    return (await getAnalyticsStore()).insights(campaignId);
  },
  async insertAnomalies(rows) {
    return (await getAnalyticsStore()).insertAnomalies(rows);
  },
  async insertInsight(row) {
    return (await getAnalyticsStore()).insertInsight(row);
  },
  async resolveAnomaly(id) {
    return (await getAnalyticsStore()).resolveAnomaly(id);
  },
  async markInsightActioned(id, actioned) {
    return (await getAnalyticsStore()).markInsightActioned(id, actioned);
  },
};

export { DEMO_ANALYTICS_USER_ID };
