import { describe, expect, it } from "vitest";

import { generateMetrics, type MetricSeed, type SeedCampaignTarget } from "@/lib/seed/analytics-generator";
import type { PerformanceMetricRow } from "@/types/database";

import { detectCampaignAnomalies, detectSeriesAnomalies, toAnomalyInserts } from "./anomalies";
import type { SeriesPoint } from "./types";

function series(values: number[]): SeriesPoint[] {
  return values.map((value, i) => ({ date: `2026-06-${String(i + 1).padStart(2, "0")}`, value }));
}

let seq = 0;
function toRows(seeds: MetricSeed[]): PerformanceMetricRow[] {
  return seeds.map((s) => ({
    id: `r${seq++}`,
    campaign_id: s.campaign_id,
    creative_id: s.creative_id ?? null,
    user_id: "u",
    platform: s.platform,
    date: s.date,
    impressions: s.impressions ?? 0,
    clicks: s.clicks ?? 0,
    conversions: s.conversions ?? 0,
    spend: s.spend ?? 0,
    revenue: s.revenue ?? 0,
    cpa: s.cpa ?? null,
    ctr: s.ctr ?? null,
    cvr: s.cvr ?? null,
    roas: s.roas ?? null,
    created_at: "t",
  }));
}

describe("detectSeriesAnomalies", () => {
  it("flags an upward spike when direction is 'high'", () => {
    const points = series([...Array(19).fill(10), 30]);
    const found = detectSeriesAnomalies(points, { direction: "high", threshold: 2.5 });
    expect(found).toHaveLength(1);
    expect(found[0].date).toBe("2026-06-20");
    expect(found[0].zScore).toBeGreaterThan(2.5);
    expect(["high", "critical"]).toContain(found[0].severity);
  });

  it("does not flag a high spike when only looking for drops", () => {
    const points = series([...Array(19).fill(10), 30]);
    expect(detectSeriesAnomalies(points, { direction: "low", threshold: 2.5 })).toHaveLength(0);
  });

  it("flags a downward drop when direction is 'low'", () => {
    const points = series([...Array(19).fill(10), 1]);
    const found = detectSeriesAnomalies(points, { direction: "low", threshold: 2.5 });
    expect(found).toHaveLength(1);
    expect(found[0].zScore).toBeLessThan(-2.5);
  });

  it("returns nothing for a flat series or too few points", () => {
    expect(detectSeriesAnomalies(series([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]))).toHaveLength(0);
    expect(detectSeriesAnomalies(series([1, 50]), { minPoints: 10 })).toHaveLength(0);
  });

  it("collapses a multi-day run into a single peak finding", () => {
    const points = series([...Array(15).fill(10), 25, 28, 26, 10, 10]);
    const found = detectSeriesAnomalies(points, { direction: "high", threshold: 2 });
    expect(found).toHaveLength(1);
    expect(found[0].date).toBe("2026-06-17"); // the peak (28) of the run
  });
});

describe("detectCampaignAnomalies on seeded data", () => {
  const target: SeedCampaignTarget = {
    campaignId: "camp-anom",
    name: "Anomaly Test",
    creatives: [
      { id: "m1", platform: "meta" },
      { id: "m2", platform: "meta" },
      { id: "g1", platform: "google" },
      { id: "t1", platform: "taboola" },
      { id: "tk1", platform: "tiktok" },
    ],
  };

  it("catches the injected CPA spike, CTR drop, and spend surge", () => {
    const ds = generateMetrics(target, { days: 90, endDate: "2026-06-29", seed: "camp-anom" });
    const findings = detectCampaignAnomalies(toRows(ds.metrics));

    const cpaTaboola = findings.find((f) => f.metric === "cpa" && f.platform === "taboola");
    expect(cpaTaboola).toBeDefined();
    expect(["high", "critical"]).toContain(cpaTaboola?.severity);

    const ctrMeta = findings.find((f) => f.metric === "ctr" && f.platform === "meta");
    expect(ctrMeta).toBeDefined();

    const spendGoogle = findings.find((f) => f.metric === "spend" && f.platform === "google");
    expect(spendGoogle).toBeDefined();
  });

  it("finds far fewer anomalies when injection is disabled", () => {
    const injected = generateMetrics(target, { days: 90, endDate: "2026-06-29", seed: "camp-anom", injectAnomalies: true });
    const clean = generateMetrics(target, { days: 90, endDate: "2026-06-29", seed: "camp-anom", injectAnomalies: false });
    const injectedCount = detectCampaignAnomalies(toRows(injected.metrics)).length;
    const cleanCount = detectCampaignAnomalies(toRows(clean.metrics)).length;
    expect(injectedCount).toBeGreaterThan(cleanCount);
  });
});

describe("toAnomalyInserts", () => {
  it("maps findings to anomaly inserts with platform-scoped metric keys", () => {
    const inserts = toAnomalyInserts(
      [
        {
          metric: "cpa",
          platform: "taboola",
          severity: "high",
          description: "spike",
          detectedAt: "2026-06-24T12:00:00.000Z",
          zScore: 4.2,
          value: 40,
          baseline: 8,
        },
        {
          metric: "spend",
          platform: "all",
          severity: "medium",
          description: "surge",
          detectedAt: "2026-06-20T12:00:00.000Z",
          zScore: 2.9,
          value: 9000,
          baseline: 5000,
        },
      ],
      "camp-1",
    );
    expect(inserts[0]).toMatchObject({ campaign_id: "camp-1", metric: "cpa:taboola", severity: "high" });
    expect(inserts[1].metric).toBe("spend"); // "all" scope drops the suffix
  });
});
