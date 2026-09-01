import { describe, expect, it } from "vitest";

import { templatedBrief, type DailyBriefInput } from "./brief";
import { METRIC_KEYS, type MetricSummary, type SummaryDeltas } from "./types";

function deltas(changes: Partial<Record<(typeof METRIC_KEYS)[number], number>>): SummaryDeltas {
  const out = {} as SummaryDeltas;
  for (const key of METRIC_KEYS) out[key] = { current: 0, previous: 0, changePct: changes[key] ?? null };
  return out;
}

const summary: MetricSummary = {
  impressions: 1_000_000,
  clicks: 20_000,
  conversions: 1500,
  spend: 25_000,
  revenue: 120_000,
  ctr: 0.02,
  cvr: 0.075,
  cpa: 16.67,
  roas: 4.8,
};

function baseInput(overrides: Partial<DailyBriefInput> = {}): DailyBriefInput {
  return {
    campaignName: "Retirement Income Weekly",
    rangeDays: 90,
    summary,
    deltas: deltas({ cpa: -8.2, conversions: 12.4, roas: 6.1 }),
    platforms: [
      { platform: "taboola", impressions: 5e5, clicks: 8000, conversions: 900, spend: 9000, revenue: 70_000, ctr: 0.016, cvr: 0.11, cpa: 10, roas: 7.8, spendShare: 0.4 },
      { platform: "tiktok", impressions: 3e5, clicks: 4000, conversions: 200, spend: 6000, revenue: 18_000, ctr: 0.013, cvr: 0.05, cpa: 30, roas: 3, spendShare: 0.24 },
    ],
    topCreatives: [],
    anomalies: [],
    recommendations: [],
    ...overrides,
  };
}

describe("templatedBrief", () => {
  it("leads with the headline result and key totals", () => {
    const content = templatedBrief(baseInput());
    expect(content).toContain("Retirement Income Weekly");
    expect(content).toContain("$25k");
    expect(content).toContain("1,500 conversions");
    expect(content).toContain("4.8x");
  });

  it("summarizes week-over-week movement", () => {
    const content = templatedBrief(baseInput());
    expect(content).toMatch(/CPA is down/i);
  });

  it("states when there are no anomalies, and surfaces the top one when present", () => {
    expect(templatedBrief(baseInput())).toMatch(/No anomalies detected/i);
    const withAnomaly = templatedBrief(
      baseInput({
        anomalies: [
          {
            metric: "cpa",
            platform: "taboola",
            severity: "high",
            description: "CPA on Taboola spiked to $42 on 2026-06-24 (320% above the $10 norm).",
            detectedAt: "2026-06-24T12:00:00.000Z",
            zScore: 4.1,
            value: 42,
            baseline: 10,
          },
        ],
      }),
    );
    expect(withAnomaly).toMatch(/Anomaly watch/i);
    expect(withAnomaly).toContain("CPA on Taboola spiked");
  });

  it("surfaces the top recommendation and is deterministic", () => {
    const input = baseInput({
      recommendations: [
        {
          id: "rec:scale:hero",
          type: "scale",
          priority: "high",
          title: "Scale Hero on Meta",
          rationale: "42% lower CPA than the campaign average.",
          campaignId: "camp",
          creativeId: "hero",
          platform: "meta",
        },
      ],
    });
    const content = templatedBrief(input);
    expect(content).toMatch(/Recommended next: Scale Hero on Meta/);
    expect(templatedBrief(input)).toBe(content);
  });
});
