import { describe, expect, it } from "vitest";

import type { PerformanceMetricRow } from "@/types/database";

import { extendedFunnel, funnel } from "./aggregate";

/** Minimal seeded metric row for funnel tests. */
function row(overrides: Partial<PerformanceMetricRow> = {}): PerformanceMetricRow {
  return {
    id: "r1",
    campaign_id: "c1",
    creative_id: "cr1",
    user_id: "u1",
    platform: "meta",
    date: "2026-08-01",
    impressions: 10000,
    clicks: 500,
    conversions: 25,
    spend: 100000,
    revenue: 250000,
    ctr: null,
    cvr: null,
    cpa: null,
    roas: null,
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("extendedFunnel", () => {
  const rows = [row()];

  it("includes Checkout Started and Paid when realMetrics provided", () => {
    const stages = extendedFunnel(rows, {
      lpViews: 400,
      checkoutStarted: 80,
      paidOrders: 30,
    });

    const names = stages.map((s) => s.stage);
    expect(names).toContain("Checkout Started");
    expect(names).toContain("Paid");
    expect(names).not.toContain("Leads");
  });

  it("falls back to modeled funnel when no checkout data", () => {
    const stages = extendedFunnel(rows);
    const names = stages.map((s) => s.stage);
    expect(names).not.toContain("Checkout Started");
    expect(names).not.toContain("Paid");
  });

  it("is monotonically non-increasing", () => {
    const stages = extendedFunnel(rows, {
      lpViews: 400,
      checkoutStarted: 80,
      paidOrders: 30,
    });

    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].value).toBeLessThanOrEqual(stages[i - 1].value);
    }
  });

  it("clamps checkout started to not exceed LP views", () => {
    const stages = extendedFunnel(rows, {
      lpViews: 100,
      checkoutStarted: 200, // more than lpViews
      paidOrders: 50,
    });

    const checkout = stages.find((s) => s.stage === "Checkout Started")!;
    const lpViews = stages.find((s) => s.stage === "LP Views")!;
    expect(checkout.value).toBeLessThanOrEqual(lpViews.value);
  });

  it("clamps paid to not exceed checkout started", () => {
    const stages = extendedFunnel(rows, {
      lpViews: 400,
      checkoutStarted: 80,
      paidOrders: 200, // more than checkoutStarted
    });

    const checkout = stages.find((s) => s.stage === "Checkout Started")!;
    const paid = stages.find((s) => s.stage === "Paid")!;
    expect(paid.value).toBeLessThanOrEqual(checkout.value);
  });

  it("original funnel still works unchanged", () => {
    const stages = funnel(rows);
    const names = stages.map((s) => s.stage);
    expect(names).toEqual(["Impressions", "Clicks", "LP Views", "Leads", "Conversions"]);
  });
});
