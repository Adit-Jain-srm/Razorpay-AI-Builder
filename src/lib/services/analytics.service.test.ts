import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Avoid pulling next/headers via the real Supabase server client.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { ANALYTICS_DEMO_CAMPAIGN_ID } from "@/lib/seed/targets";
import type { Database, PerformanceMetricInsert } from "@/types/database";

import { InMemoryAnalyticsStore, SupabaseAnalyticsStore } from "./analytics.service";

/* -------------------------------------------------------------------------- */
/* In-memory store (seeded demo)                                              */
/* -------------------------------------------------------------------------- */

describe("InMemoryAnalyticsStore (seeded)", () => {
  it("seeds 90 days of multi-platform demo metrics for the demo campaign", async () => {
    const store = new InMemoryAnalyticsStore();
    const rows = await store.metrics({ campaignId: ANALYTICS_DEMO_CAMPAIGN_ID });
    expect(rows.length).toBeGreaterThan(100);
    const platforms = new Set(rows.map((r) => r.platform));
    expect(platforms.has("meta")).toBe(true);
    expect(platforms.has("taboola")).toBe(true);
  });

  it("computes a positive summary and detects seeded anomalies", async () => {
    const store = new InMemoryAnalyticsStore();
    const summary = await store.summary({ campaignId: ANALYTICS_DEMO_CAMPAIGN_ID });
    expect(summary.spend).toBeGreaterThan(0);
    expect(summary.conversions).toBeGreaterThan(0);
    expect(summary.roas).toBeGreaterThan(0);

    const anomalies = await store.anomalies(ANALYTICS_DEMO_CAMPAIGN_ID);
    expect(anomalies.length).toBeGreaterThan(0);
  });

  it("filters metrics by platform", async () => {
    const store = new InMemoryAnalyticsStore();
    const meta = await store.metrics({ campaignId: ANALYTICS_DEMO_CAMPAIGN_ID, platform: "meta" });
    expect(meta.length).toBeGreaterThan(0);
    expect(meta.every((r) => r.platform === "meta")).toBe(true);
  });
});

describe("InMemoryAnalyticsStore (unseeded)", () => {
  it("starts empty and accepts inserted metrics", async () => {
    const store = new InMemoryAnalyticsStore(false);
    expect(await store.metrics({})).toHaveLength(0);
    const written = await store.insertMetrics([
      { campaign_id: "c1", user_id: "ignored", platform: "meta", date: "2026-06-01", impressions: 100, clicks: 10, conversions: 1, spend: 5, revenue: 20 },
    ]);
    expect(written).toBe(1);
    const rows = await store.metrics({ campaignId: "c1" });
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).not.toBe("ignored"); // store owns user scoping
  });

  it("persists and resolves anomalies + insights", async () => {
    const store = new InMemoryAnalyticsStore(false);
    await store.insertAnomalies([{ campaign_id: "c1", metric: "cpa:meta", severity: "high", description: "spike", detected_at: "2026-06-24T12:00:00Z" }]);
    const anomalies = await store.anomalies("c1");
    expect(anomalies).toHaveLength(1);
    await store.resolveAnomaly(anomalies[0].id);
    expect((await store.anomalies("c1"))[0].resolved_at).not.toBeNull();

    const insight = await store.insertInsight({ campaign_id: "c1", type: "daily_brief", content: "Brief", confidence: 0.6 });
    expect((await store.insights("c1"))).toHaveLength(1);
    await store.markInsightActioned(insight.id, true);
    expect((await store.insights("c1"))[0].actioned).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Supabase store (mocked client)                                             */
/* -------------------------------------------------------------------------- */

const insertedPayloads: Array<Record<string, unknown>[]> = [];

const SAMPLE_METRICS = [
  { id: "1", campaign_id: "c", creative_id: "A", user_id: "u", platform: "meta", date: "2026-06-01", impressions: 1000, clicks: 50, conversions: 10, spend: 50, revenue: 200, cpa: 5, ctr: 0.05, cvr: 0.2, roas: 4, created_at: "t" },
  { id: "2", campaign_id: "c", creative_id: "B", user_id: "u", platform: "taboola", date: "2026-06-02", impressions: 2000, clicks: 40, conversions: 8, spend: 30, revenue: 240, cpa: 3.75, ctr: 0.02, cvr: 0.2, roas: 8, created_at: "t" },
];

interface BuilderState {
  op: "select" | "insert" | "update";
  count: number;
  single: boolean;
  payload?: Record<string, unknown>[];
}

function makeBuilder() {
  const state: BuilderState = { op: "select", count: 0, single: false };
  const builder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    single: () => {
      state.single = true;
      return builder;
    },
    maybeSingle: () => {
      state.single = true;
      return builder;
    },
    insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
      state.op = "insert";
      state.payload = Array.isArray(payload) ? payload : [payload];
      state.count = state.payload.length;
      insertedPayloads.push(state.payload);
      return builder;
    },
    update: () => {
      state.op = "update";
      return builder;
    },
    then<T1 = unknown, T2 = never>(onF?: ((v: { data: unknown; error: unknown; count?: number }) => T1 | PromiseLike<T1>) | null, onR?: ((r: unknown) => T2 | PromiseLike<T2>) | null) {
      let result: { data: unknown; error: unknown; count?: number };
      if (state.op === "insert") {
        result = state.single
          ? { data: { id: "ins-1", user_id: "user-123", actioned: false, confidence: null, created_at: "t", ...state.payload?.[0] }, error: null }
          : { data: null, error: null, count: state.count };
      } else if (state.op === "update") {
        result = { data: null, error: null };
      } else {
        result = { data: SAMPLE_METRICS, error: null };
      }
      return Promise.resolve(result).then(onF, onR);
    },
  };
  return builder;
}

function makeClient(): SupabaseClient<Database> {
  return { from: () => makeBuilder() } as unknown as SupabaseClient<Database>;
}

describe("SupabaseAnalyticsStore (mocked)", () => {
  afterEach(() => {
    insertedPayloads.length = 0;
  });

  it("reads metrics and summarizes them", async () => {
    const store = new SupabaseAnalyticsStore(makeClient(), "user-123");
    const rows = await store.metrics({ campaignId: "c" });
    expect(rows).toHaveLength(2);
    const summary = await store.summary({ campaignId: "c" });
    expect(summary.impressions).toBe(3000);
    expect(summary.spend).toBe(80);
  });

  it("forces user scoping when inserting metrics and returns the count", async () => {
    const store = new SupabaseAnalyticsStore(makeClient(), "user-123");
    const rows: PerformanceMetricInsert[] = [
      { campaign_id: "c", user_id: "spoofed", platform: "meta", date: "2026-06-01", impressions: 10, clicks: 1, conversions: 0, spend: 1, revenue: 0 },
    ];
    const written = await store.insertMetrics(rows);
    expect(written).toBe(1);
    expect(insertedPayloads[0][0].user_id).toBe("user-123");
  });

  it("persists anomalies and an insight", async () => {
    const store = new SupabaseAnalyticsStore(makeClient(), "user-123");
    const count = await store.insertAnomalies([{ campaign_id: "c", metric: "cpa:meta", severity: "high", description: "spike", detected_at: "2026-06-24T12:00:00Z" }]);
    expect(count).toBe(1);
    expect(insertedPayloads[0][0].user_id).toBe("user-123");

    const insight = await store.insertInsight({ campaign_id: "c", type: "daily_brief", content: "Brief", confidence: 0.7 });
    expect(insight.user_id).toBe("user-123");
  });
});
