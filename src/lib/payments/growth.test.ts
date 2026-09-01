import { describe, expect, it } from "vitest";

import type { AudienceAllocation } from "@/lib/campaign/brief";

import {
  applyReallocation,
  buildGrowthScorecard,
  computeReallocation,
  type AudienceMetrics,
} from "./growth";

/* -------------------------------------------------------------------------- */
/* Fixtures (your A/B/C audience comparison table from the plan)              */
/* -------------------------------------------------------------------------- */

const AUDIENCES: AudienceMetrics[] = [
  { personaId: "A", personaName: "Fitness-conscious 18-30", ctr: 3.8, cvr: 4.1, cpaPaise: 16200, gmvPaise: 450_000, orders: 28, spend: 453_600 },
  { personaId: "B", personaName: "Health-aware working professionals", ctr: 2.4, cvr: 7.3, cpaPaise: 11800, gmvPaise: 620_000, orders: 41, spend: 483_800 },
  { personaId: "C", personaName: "Casual fitness beginners", ctr: 5.1, cvr: 1.8, cpaPaise: 24300, gmvPaise: 180_000, orders: 12, spend: 291_600 },
];

const ALLOCATIONS: AudienceAllocation[] = [
  { personaId: "A", percent: 35, rationale: "Initial" },
  { personaId: "B", percent: 40, rationale: "Initial" },
  { personaId: "C", percent: 25, rationale: "Initial" },
];

/* -------------------------------------------------------------------------- */
/* Growth scorecard                                                           */
/* -------------------------------------------------------------------------- */

describe("buildGrowthScorecard", () => {
  it("computes totals correctly", () => {
    const sc = buildGrowthScorecard("camp-1", AUDIENCES);
    expect(sc.totalGmvPaise).toBe(450_000 + 620_000 + 180_000);
    expect(sc.totalOrders).toBe(28 + 41 + 12);
  });

  it("identifies best (lowest CPA) and worst (highest CPA) audiences", () => {
    const sc = buildGrowthScorecard("camp-1", AUDIENCES);
    expect(sc.bestAudience).toBe("B");
    expect(sc.worstAudience).toBe("C");
  });

  it("handles empty audiences", () => {
    const sc = buildGrowthScorecard("camp-1", []);
    expect(sc.bestAudience).toBeNull();
    expect(sc.worstAudience).toBeNull();
    expect(sc.totalGmvPaise).toBe(0);
  });

  it("handles audiences with zero orders", () => {
    const zeroOrders: AudienceMetrics[] = [
      { personaId: "X", personaName: "Test", ctr: 0, cvr: 0, cpaPaise: 0, gmvPaise: 0, orders: 0, spend: 0 },
    ];
    const sc = buildGrowthScorecard("camp-1", zeroOrders);
    expect(sc.bestAudience).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Reallocation                                                               */
/* -------------------------------------------------------------------------- */

describe("computeReallocation", () => {
  const scorecard = buildGrowthScorecard("camp-1", AUDIENCES);

  it("shifts from worst (C) to best (B)", () => {
    const proposal = computeReallocation(ALLOCATIONS, scorecard);
    expect(proposal).not.toBeNull();
    expect(proposal!.from.personaId).toBe("C");
    expect(proposal!.to.personaId).toBe("B");
    expect(proposal!.shiftPercent).toBeGreaterThan(0);
    expect(proposal!.shiftPercent).toBeLessThanOrEqual(15);
  });

  it("respects maxShiftPercent", () => {
    const proposal = computeReallocation(ALLOCATIONS, scorecard, 5);
    expect(proposal!.shiftPercent).toBe(5);
  });

  it("does not shift more than the source has", () => {
    const tinyAllocs: AudienceAllocation[] = [
      { personaId: "B", percent: 90, rationale: "" },
      { personaId: "C", percent: 10, rationale: "" },
    ];
    const proposal = computeReallocation(tinyAllocs, scorecard, 20);
    expect(proposal!.shiftPercent).toBe(10);
  });

  it("returns null when best === worst", () => {
    const singleAudience = buildGrowthScorecard("camp-1", [AUDIENCES[0]]);
    expect(computeReallocation(ALLOCATIONS, singleAudience)).toBeNull();
  });

  it("returns null when source has 0%", () => {
    const zeroAllocs: AudienceAllocation[] = [
      { personaId: "B", percent: 100, rationale: "" },
      { personaId: "C", percent: 0, rationale: "" },
    ];
    expect(computeReallocation(zeroAllocs, scorecard)).toBeNull();
  });
});

describe("applyReallocation", () => {
  const scorecard = buildGrowthScorecard("camp-1", AUDIENCES);
  const proposal = computeReallocation(ALLOCATIONS, scorecard)!;

  it("updates the from and to percentages", () => {
    const result = applyReallocation(ALLOCATIONS, proposal);
    const fromResult = result.find((a) => a.personaId === "C")!;
    const toResult = result.find((a) => a.personaId === "B")!;
    expect(fromResult.percent).toBe(proposal.from.newPercent);
    expect(toResult.percent).toBe(proposal.to.newPercent);
  });

  it("does not mutate the original allocations", () => {
    const original = ALLOCATIONS.map((a) => ({ ...a }));
    applyReallocation(ALLOCATIONS, proposal);
    expect(ALLOCATIONS).toEqual(original);
  });

  it("preserves unchanged allocations", () => {
    const result = applyReallocation(ALLOCATIONS, proposal);
    const unchanged = result.find((a) => a.personaId === "A")!;
    expect(unchanged.percent).toBe(35);
  });

  it("total still approximately sums to 100", () => {
    const result = applyReallocation(ALLOCATIONS, proposal);
    const total = result.reduce((sum, a) => sum + a.percent, 0);
    expect(total).toBe(100);
  });
});
