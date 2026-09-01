import { describe, expect, it } from "vitest";

import { mean, median } from "@/lib/analytics/math";

import { generateMetrics, type SeedCampaignTarget } from "./analytics-generator";

const TARGET: SeedCampaignTarget = {
  campaignId: "camp-seed",
  name: "Seed Test",
  creatives: [
    { id: "m1", platform: "meta", launchDayOffset: 0 },
    { id: "m2", platform: "meta", launchDayOffset: 0 },
    { id: "g1", platform: "google", launchDayOffset: 0 },
    { id: "tk1", platform: "tiktok", launchDayOffset: 0 },
    { id: "tb1", platform: "taboola", launchDayOffset: 0 },
  ],
};

const OPTIONS = { days: 90, endDate: "2026-06-29", seed: "camp-seed" } as const;

describe("generateMetrics: determinism", () => {
  it("produces identical output for the same seed + options", () => {
    const a = generateMetrics(TARGET, OPTIONS);
    const b = generateMetrics(TARGET, OPTIONS);
    expect(a.metrics).toEqual(b.metrics);
    expect(a.injected).toEqual(b.injected);
  });

  it("produces different output for a different seed", () => {
    const a = generateMetrics(TARGET, OPTIONS);
    const b = generateMetrics(TARGET, { ...OPTIONS, seed: "other-seed" });
    expect(a.metrics).not.toEqual(b.metrics);
  });
});

describe("generateMetrics: coverage + shape", () => {
  it("spans all four platforms across 90 days", () => {
    const { metrics } = generateMetrics(TARGET, OPTIONS);
    const platforms = new Set(metrics.map((m) => m.platform));
    expect([...platforms].sort()).toEqual(["google", "meta", "taboola", "tiktok"]);
    const dates = new Set(metrics.map((m) => m.date));
    expect(dates.size).toBe(90);
    // A day-0 creative has exactly one row per day.
    expect(metrics.filter((m) => m.creative_id === "m1")).toHaveLength(90);
  });

  it("respects staggered launches (fresh creatives have fewer rows)", () => {
    const target: SeedCampaignTarget = {
      campaignId: "camp-late",
      name: "Late",
      creatives: [
        { id: "old", platform: "meta", launchDayOffset: 0 },
        { id: "fresh", platform: "meta", launchDayOffset: 60 },
      ],
    };
    const { metrics } = generateMetrics(target, { ...OPTIONS, seed: "camp-late" });
    expect(metrics.filter((m) => m.creative_id === "old")).toHaveLength(90);
    expect(metrics.filter((m) => m.creative_id === "fresh")).toHaveLength(30);
  });
});

describe("generateMetrics: plausibility", () => {
  it("keeps every row internally consistent and in realistic ranges", () => {
    const { metrics } = generateMetrics(TARGET, OPTIONS);
    for (const m of metrics) {
      const impressions = m.impressions ?? 0;
      const clicks = m.clicks ?? 0;
      const conversions = m.conversions ?? 0;
      expect(impressions).toBeGreaterThan(0);
      expect(clicks).toBeLessThanOrEqual(impressions);
      expect(conversions).toBeLessThanOrEqual(clicks);
      expect(m.spend ?? 0).toBeGreaterThanOrEqual(0);
      if (m.ctr !== null) expect(m.ctr).toBeGreaterThanOrEqual(0.0005);
      if (m.ctr !== null) expect(m.ctr).toBeLessThanOrEqual(0.25);
      if (m.cvr !== null) expect(m.cvr).toBeLessThanOrEqual(0.5);
      if (conversions > 0) expect(m.cpa ?? 0).toBeGreaterThan(0);
    }
  });

  it("produces sensible blended CPAs per platform (Taboola cheapest, TikTok priciest)", () => {
    const { metrics } = generateMetrics(TARGET, OPTIONS);
    const cpaFor = (platform: string): number => {
      const rows = metrics.filter((m) => m.platform === platform);
      const spend = rows.reduce((s, m) => s + (m.spend ?? 0), 0);
      const conv = rows.reduce((s, m) => s + (m.conversions ?? 0), 0);
      return spend / conv;
    };
    expect(cpaFor("taboola")).toBeLessThan(cpaFor("meta"));
    expect(cpaFor("tiktok")).toBeGreaterThan(cpaFor("taboola"));
  });
});

describe("generateMetrics: creative fatigue", () => {
  it("decays CTR for a long-running creative (early > late)", () => {
    const { metrics } = generateMetrics(TARGET, OPTIONS);
    const m1 = metrics
      .filter((m) => m.creative_id === "m1" && m.ctr !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    const early = mean(m1.slice(0, 14).map((m) => m.ctr ?? 0));
    const late = mean(m1.slice(-14).map((m) => m.ctr ?? 0));
    expect(early).toBeGreaterThan(late);
  });
});

describe("generateMetrics: injected anomalies", () => {
  it("records the injected anomalies and makes the CPA spike detectable", () => {
    const ds = generateMetrics(TARGET, OPTIONS);
    expect(ds.injected.some((a) => a.metric === "cpa" && a.platform === "taboola")).toBe(true);
    expect(ds.injected.some((a) => a.metric === "ctr" && a.platform === "meta")).toBe(true);

    const spike = ds.injected.find((a) => a.metric === "cpa" && a.platform === "taboola");
    expect(spike).toBeDefined();
    // Aggregate Taboola CPA on the spike date should dwarf the platform median.
    const taboola = ds.metrics.filter((m) => m.platform === "taboola");
    const dailyCpa = (date: string): number => {
      const rows = taboola.filter((m) => m.date === date);
      const spend = rows.reduce((s, m) => s + (m.spend ?? 0), 0);
      const conv = rows.reduce((s, m) => s + (m.conversions ?? 0), 0);
      return conv > 0 ? spend / conv : 0;
    };
    const allDays = [...new Set(taboola.map((m) => m.date))];
    const med = median(allDays.map(dailyCpa).filter((v) => v > 0));
    expect(dailyCpa(spike!.date)).toBeGreaterThan(med * 1.8);
  });

  it("omits injected anomalies when disabled", () => {
    const ds = generateMetrics(TARGET, { ...OPTIONS, injectAnomalies: false });
    expect(ds.injected).toHaveLength(0);
  });
});
