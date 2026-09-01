import { describe, expect, it } from "vitest";

import type { PerformanceMetricRow } from "@/types/database";

import {
  addDays,
  dailySeries,
  dateRange,
  filterMetrics,
  funnel,
  periodDeltas,
  summarize,
  summarizeByCreative,
  summarizeByPlatform,
} from "./aggregate";
import type { CreativeMeta } from "./types";

let seq = 0;
function row(o: Partial<PerformanceMetricRow> & { date: string }): PerformanceMetricRow {
  const impressions = o.impressions ?? 1000;
  const clicks = o.clicks ?? 50;
  const conversions = o.conversions ?? 10;
  const spend = o.spend ?? 50;
  const revenue = o.revenue ?? 200;
  return {
    id: o.id ?? `r${seq++}`,
    campaign_id: o.campaign_id ?? "camp",
    creative_id: o.creative_id ?? null,
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

describe("aggregate: summarize", () => {
  it("recomputes ratios from summed totals (never averages ratios)", () => {
    const rows = [
      row({ date: "2026-06-01", impressions: 1000, clicks: 100, conversions: 10, spend: 100, revenue: 500 }),
      row({ date: "2026-06-02", impressions: 1000, clicks: 50, conversions: 5, spend: 100, revenue: 300 }),
    ];
    const s = summarize(rows);
    expect(s.impressions).toBe(2000);
    expect(s.clicks).toBe(150);
    expect(s.conversions).toBe(15);
    expect(s.spend).toBe(200);
    expect(s.revenue).toBe(800);
    expect(s.ctr).toBeCloseTo(150 / 2000, 6); // 0.075
    expect(s.cvr).toBeCloseTo(15 / 150, 6); // 0.1
    expect(s.cpa).toBeCloseTo(200 / 15, 4); // 13.33
    expect(s.roas).toBeCloseTo(800 / 200, 4); // 4
  });

  it("returns zeros for an empty input without throwing", () => {
    const s = summarize([]);
    expect(s).toMatchObject({ impressions: 0, clicks: 0, spend: 0, cpa: 0, roas: 0 });
  });
});

describe("aggregate: platform + creative breakdowns", () => {
  const rows = [
    row({ date: "2026-06-01", platform: "meta", creative_id: "A", spend: 100, conversions: 20, revenue: 400 }),
    row({ date: "2026-06-01", platform: "taboola", creative_id: "B", spend: 60, conversions: 10, revenue: 360 }),
    row({ date: "2026-06-02", platform: "meta", creative_id: "A", spend: 100, conversions: 10, revenue: 200 }),
  ];

  it("summarizes by platform with spend share, sorted by spend desc", () => {
    const platforms = summarizeByPlatform(rows);
    expect(platforms[0].platform).toBe("meta");
    expect(platforms[0].spend).toBe(200);
    expect(platforms[0].spendShare).toBeCloseTo(200 / 260, 4);
    expect(platforms[1].platform).toBe("taboola");
  });

  it("summarizes by creative with resolved labels", () => {
    const meta = new Map<string, CreativeMeta>([["A", { id: "A", label: "Hero", platform: "meta" }]]);
    const creatives = summarizeByCreative(rows, meta);
    const hero = creatives.find((c) => c.creativeId === "A");
    expect(hero?.label).toBe("Hero");
    expect(hero?.spend).toBe(200);
    const b = creatives.find((c) => c.creativeId === "B");
    expect(b?.label).toContain("Creative"); // unknown id falls back
  });
});

describe("aggregate: dailySeries + filters", () => {
  const rows = [
    row({ date: "2026-06-01", platform: "meta", spend: 50 }),
    row({ date: "2026-06-01", platform: "taboola", spend: 30 }),
    row({ date: "2026-06-02", platform: "meta", spend: 70 }),
  ];

  it("builds an ascending daily series for a metric", () => {
    const series = dailySeries(rows, "spend");
    expect(series).toEqual([
      { date: "2026-06-01", value: 80 },
      { date: "2026-06-02", value: 70 },
    ]);
  });

  it("filters by platform and date window", () => {
    expect(filterMetrics(rows, { platform: "meta" })).toHaveLength(2);
    expect(filterMetrics(rows, { from: "2026-06-02" })).toHaveLength(1);
  });

  it("computes the date range", () => {
    expect(dateRange(rows)).toEqual({ from: "2026-06-01", to: "2026-06-02" });
    expect(dateRange([])).toBeNull();
  });
});

describe("aggregate: funnel", () => {
  it("is monotonically non-increasing and rooted at impressions", () => {
    const rows = [row({ date: "2026-06-01", impressions: 10000, clicks: 500, conversions: 40 })];
    const stages = funnel(rows);
    expect(stages.map((s) => s.stage)).toEqual(["Impressions", "Clicks", "LP Views", "Leads", "Conversions"]);
    const values = stages.map((s) => s.value);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    expect(stages[0].value).toBe(10000);
    expect(stages[stages.length - 1].value).toBe(40);
    expect(stages[0].stepRate).toBeNull();
    expect(stages[1].overallRate).toBeCloseTo(0.05, 6);
  });
});

describe("aggregate: addDays + periodDeltas", () => {
  it("adds days across month boundaries (UTC)", () => {
    expect(addDays("2026-06-29", 3)).toBe("2026-07-02");
    expect(addDays("2026-06-01", -1)).toBe("2026-05-31");
  });

  it("compares the most recent window to the prior window", () => {
    const rows = [
      // previous window (Jun 1-2): cheaper CPA
      row({ date: "2026-06-01", spend: 50, conversions: 10 }),
      row({ date: "2026-06-02", spend: 50, conversions: 10 }),
      // current window (Jun 3-4): pricier CPA
      row({ date: "2026-06-03", spend: 100, conversions: 10 }),
      row({ date: "2026-06-04", spend: 100, conversions: 10 }),
    ];
    const deltas = periodDeltas(rows, 2, "2026-06-04");
    expect(deltas.spend.current).toBe(200);
    expect(deltas.spend.previous).toBe(100);
    expect(deltas.spend.changePct).toBeCloseTo(100, 4);
    expect(deltas.cpa.current).toBeCloseTo(10, 4);
    expect(deltas.cpa.previous).toBeCloseTo(5, 4);
  });
});
