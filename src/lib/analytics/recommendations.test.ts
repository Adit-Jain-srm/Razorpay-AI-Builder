import { describe, expect, it } from "vitest";

import type { PerformanceMetricRow } from "@/types/database";

import { buildRecommendations } from "./recommendations";
import type { CreativeMeta } from "./types";

let seq = 0;
function row(o: Partial<PerformanceMetricRow> & { date: string; creative_id: string }): PerformanceMetricRow {
  const impressions = o.impressions ?? 1000;
  const clicks = o.clicks ?? 50;
  const conversions = o.conversions ?? 10;
  const spend = o.spend ?? 50;
  const revenue = o.revenue ?? 200;
  return {
    id: `r${seq++}`,
    campaign_id: o.campaign_id ?? "camp",
    creative_id: o.creative_id,
    user_id: "u",
    platform: o.platform ?? "meta",
    date: o.date,
    impressions,
    clicks,
    conversions,
    spend,
    revenue,
    cpa: conversions ? spend / conversions : null,
    ctr: impressions ? clicks / impressions : null,
    cvr: clicks ? conversions / clicks : null,
    roas: spend ? revenue / spend : null,
    created_at: "t",
  };
}

function dateAt(i: number): string {
  return `2026-06-${String(10 + i).padStart(2, "0")}`;
}

const META = new Map<string, CreativeMeta>([
  ["hero", { id: "hero", label: "Hero", platform: "meta" }],
  ["mid", { id: "mid", label: "Mid", platform: "meta" }],
  ["lag", { id: "lag", label: "Laggard", platform: "tiktok" }],
]);

describe("buildRecommendations", () => {
  it("returns nothing for empty data", () => {
    expect(buildRecommendations({ rows: [], campaignId: "c", meta: new Map() })).toEqual([]);
  });

  it("recommends scale, pause, and reallocate from clear performance gaps", () => {
    const rows: PerformanceMetricRow[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push(row({ date: dateAt(i), platform: "meta", creative_id: "hero", clicks: 50, conversions: 10, spend: 50, revenue: 200 }));
      rows.push(row({ date: dateAt(i), platform: "meta", creative_id: "mid", clicks: 40, conversions: 5, spend: 80, revenue: 160 }));
      rows.push(row({ date: dateAt(i), platform: "tiktok", creative_id: "lag", clicks: 30, conversions: 2, spend: 60, revenue: 60 }));
    }
    const recs = buildRecommendations({ rows, campaignId: "camp", meta: META });

    const scale = recs.find((r) => r.type === "scale");
    expect(scale?.creativeId).toBe("hero");
    expect(scale?.title).toContain("Scale");

    const pause = recs.find((r) => r.type === "pause" && r.creativeId === "lag");
    expect(pause).toBeDefined();
    expect(pause?.rationale).toMatch(/target/i);

    const reallocate = recs.find((r) => r.type === "reallocate");
    expect(reallocate?.platform).toBe("meta");

    // Every recommendation is anchored to the real campaign id.
    expect(recs.every((r) => r.campaignId === "camp")).toBe(true);
  });

  it("recommends a refresh when a creative's CTR decays (fatigue)", () => {
    const rows: PerformanceMetricRow[] = [];
    for (let i = 0; i < 12; i++) {
      rows.push(
        row({
          date: dateAt(i),
          platform: "meta",
          creative_id: "fade",
          clicks: 80 - i * 5, // CTR declines 0.080 -> 0.025
          conversions: 5,
          spend: 50,
          revenue: 150,
        }),
      );
    }
    const recs = buildRecommendations({ rows, campaignId: "camp", meta: new Map() });
    const refresh = recs.find((r) => r.type === "refresh" && r.creativeId === "fade");
    expect(refresh).toBeDefined();
    expect(refresh?.metricLabel).toMatch(/CTR/);
  });

  it("creates investigate recommendations from high-severity anomalies", () => {
    const rows = [row({ date: dateAt(0), creative_id: "x", platform: "meta" })];
    const recs = buildRecommendations({
      rows,
      campaignId: "camp",
      meta: new Map(),
      anomalies: [
        {
          metric: "cpa",
          platform: "taboola",
          severity: "critical",
          description: "CPA spiked",
          detectedAt: "2026-06-24T12:00:00.000Z",
          zScore: 4.5,
          value: 40,
          baseline: 8,
        },
      ],
    });
    expect(recs.some((r) => r.type === "investigate")).toBe(true);
  });
});
