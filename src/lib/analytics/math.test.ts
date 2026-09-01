import { describe, expect, it } from "vitest";

import { linearTrend, mean, median, movingAverage, percentChange, round, safeDiv, stddev, zScores } from "./math";

describe("math: mean/stddev/median", () => {
  it("computes mean and is 0 for empty", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([])).toBe(0);
  });

  it("computes population stddev (0 for <2 points)", () => {
    expect(stddev([5, 5, 5, 5])).toBe(0);
    expect(stddev([10])).toBe(0);
    expect(round(stddev([2, 4, 4, 4, 5, 5, 7, 9]), 4)).toBe(2);
  });

  it("computes median for odd and even lengths without mutating input", () => {
    const input = [3, 1, 2];
    expect(median(input)).toBe(2);
    expect(input).toEqual([3, 1, 2]);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("math: zScores", () => {
  it("returns all-zero for a flat series", () => {
    expect(zScores([7, 7, 7])).toEqual([0, 0, 0]);
  });

  it("flags a clear outlier with a large z-score", () => {
    const values = [...Array(19).fill(10), 30];
    const z = zScores(values);
    expect(z[19]).toBeGreaterThan(3);
    expect(z[0]).toBeLessThan(0);
  });
});

describe("math: safeDiv + percentChange", () => {
  it("safeDiv guards against divide-by-zero", () => {
    expect(safeDiv(10, 2)).toBe(5);
    expect(safeDiv(10, 0)).toBe(0);
    expect(safeDiv(10, 0, -1)).toBe(-1);
  });

  it("percentChange returns null when the baseline is 0", () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe("math: linearTrend", () => {
  it("fits a perfect ascending line", () => {
    const trend = linearTrend([0, 1, 2, 3, 4]);
    expect(round(trend.slope, 4)).toBe(1);
    expect(round(trend.intercept, 4)).toBe(0);
    expect(trend.points.map((p) => round(p, 4))).toEqual([0, 1, 2, 3, 4]);
  });

  it("detects a downward slope (fatigue-like decline)", () => {
    const trend = linearTrend([10, 8, 6, 4, 2]);
    expect(trend.slope).toBeLessThan(0);
  });
});

describe("math: movingAverage", () => {
  it("smooths a series with a trailing window", () => {
    expect(movingAverage([2, 4, 6, 8], 2)).toEqual([2, 3, 5, 7]);
  });
});
