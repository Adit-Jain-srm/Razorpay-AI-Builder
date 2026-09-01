import { describe, expect, it } from "vitest";

import { classifyHookHeuristic } from "./hooks";
import { buildField, measureField } from "./limits";
import { scoreGrade, scoreVariant } from "./scoring";

describe("scoreVariant", () => {
  const strongFields = [
    buildField("primary_text", "Primary text", 125, "Inflation is eating your savings. Get the plain-English 2026 plan that targets 8% income."),
    buildField("headline", "Headline", 40, "Protect Your Nest Egg in 2026"),
  ];
  const weakFields = [
    buildField("primary_text", "Primary text", 125, "We are a company that does things for people sometimes."),
    buildField("headline", "Headline", 40, "Hello"),
  ];

  it("scores a specific, CTA-driven, hooked variant higher than a vague one", () => {
    const strong = scoreVariant("meta", strongFields, classifyHookHeuristic("Inflation is eating your savings. Get the plan."));
    const weak = scoreVariant("meta", weakFields, classifyHookHeuristic("We are a company that does things."));
    expect(strong.total).toBeGreaterThan(weak.total);
  });

  it("keeps every sub-score and total within 0-100", () => {
    const result = scoreVariant("meta", strongFields, classifyHookHeuristic("Get the plan"));
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    for (const value of Object.values(result.breakdown)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("penalizes clarity when a field exceeds its limit", () => {
    const overLimit = [measureField("headline", "Headline", 10, "this is far too long for the limit")];
    const result = scoreVariant("meta", overLimit, classifyHookHeuristic("x"));
    expect(result.breakdown.clarity).toBeLessThan(100);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("rewards a present CTA verb", () => {
    const withCta = scoreVariant("meta", [buildField("headline", "H", 40, "Download the free guide now")], classifyHookHeuristic("Download now"));
    const withoutCta = scoreVariant("meta", [buildField("headline", "H", 40, "A pleasant statement about things")], classifyHookHeuristic("A pleasant statement"));
    expect(withCta.breakdown.ctaStrength).toBeGreaterThan(withoutCta.breakdown.ctaStrength);
  });
});

describe("scoreGrade", () => {
  it("maps totals to letter grades", () => {
    expect(scoreGrade(92)).toBe("A");
    expect(scoreGrade(72)).toBe("B");
    expect(scoreGrade(58)).toBe("C");
    expect(scoreGrade(40)).toBe("D");
  });
});
