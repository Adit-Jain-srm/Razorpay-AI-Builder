import { describe, expect, it } from "vitest";

import { assignVariant, conversionRate, hashToUnitInterval, pickWinner, type AbVariant, type VariantPerformance } from "./ab";

const VARIANTS: AbVariant[] = [
  { id: "a", weight: 50 },
  { id: "b", weight: 50 },
];

describe("assignVariant", () => {
  it("is deterministic: the same visitor + key always maps to the same variant", () => {
    const first = assignVariant("visitor-123", "exp-1", VARIANTS);
    for (let i = 0; i < 50; i += 1) {
      expect(assignVariant("visitor-123", "exp-1", VARIANTS)?.id).toBe(first?.id);
    }
  });

  it("is independent of input order", () => {
    const a = assignVariant("visitor-xyz", "exp-1", VARIANTS);
    const b = assignVariant("visitor-xyz", "exp-1", [...VARIANTS].reverse());
    expect(a?.id).toBe(b?.id);
  });

  it("splits a population across both variants", () => {
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i += 1) {
      const variant = assignVariant(`visitor-${i}`, "exp-1", VARIANTS);
      if (variant) counts[variant.id] += 1;
    }
    expect(counts.a).toBeGreaterThan(300);
    expect(counts.b).toBeGreaterThan(300);
    expect(counts.a + counts.b).toBe(1000);
  });

  it("respects weights (90/10 skews heavily to the heavy variant)", () => {
    const weighted: AbVariant[] = [
      { id: "a", weight: 90 },
      { id: "b", weight: 10 },
    ];
    let aCount = 0;
    for (let i = 0; i < 1000; i += 1) {
      if (assignVariant(`v-${i}`, "exp-w", weighted)?.id === "a") aCount += 1;
    }
    expect(aCount).toBeGreaterThan(800);
  });

  it("excludes zero-weight variants (auto-promote routes all traffic to the winner)", () => {
    const promoted: AbVariant[] = [
      { id: "winner", weight: 100 },
      { id: "loser", weight: 0 },
    ];
    for (let i = 0; i < 200; i += 1) {
      expect(assignVariant(`v-${i}`, "exp-p", promoted)?.id).toBe("winner");
    }
  });

  it("returns null when no variant has positive weight", () => {
    expect(assignVariant("v", "exp", [{ id: "x", weight: 0 }])).toBeNull();
    expect(assignVariant("v", "exp", [])).toBeNull();
  });

  it("hashes into the unit interval", () => {
    for (const seed of ["a", "b", "longer-seed-value", ""]) {
      const value = hashToUnitInterval(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("pickWinner", () => {
  const enough = (id: string, views: number, leads: number, isControl = false): VariantPerformance => ({
    id,
    label: id,
    views,
    leads,
    isControl,
  });

  it("returns insufficient_data until every variant has the minimum views", () => {
    const result = pickWinner([enough("a", 50, 10, true), enough("b", 500, 100)], { minViewsPerVariant: 100 });
    expect(result.reason).toBe("insufficient_data");
    expect(result.winnerId).toBeNull();
  });

  it("returns no_clear_winner when the lift is below the threshold", () => {
    // a: 10% CVR, b: 10.5% CVR -> 5% relative lift, below the 10% threshold.
    const result = pickWinner([enough("a", 1000, 100, true), enough("b", 1000, 105)], {
      minViewsPerVariant: 100,
      minRelativeLift: 0.1,
    });
    expect(result.reason).toBe("no_clear_winner");
    expect(result.winnerId).toBeNull();
  });

  it("declares a winner when data is sufficient and the lift clears the threshold", () => {
    // a: 10% CVR, b: 15% CVR -> 50% relative lift.
    const result = pickWinner([enough("a", 1000, 100, true), enough("b", 1000, 150)], {
      minViewsPerVariant: 100,
      minRelativeLift: 0.1,
    });
    expect(result.reason).toBe("winner");
    expect(result.winnerId).toBe("b");
    expect(result.relativeLift).toBeGreaterThan(0.4);
  });
});

describe("conversionRate", () => {
  it("guards against divide-by-zero", () => {
    expect(conversionRate(0, 0)).toBe(0);
    expect(conversionRate(100, 25)).toBe(0.25);
  });
});
