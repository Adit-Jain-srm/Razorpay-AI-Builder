import { describe, expect, it } from "vitest";

import { deriveToneProfile, summarizeToneForPrompt } from "./brand-voice";

describe("deriveToneProfile", () => {
  it("returns safe defaults for no samples", () => {
    const profile = deriveToneProfile([]);
    expect(profile.sampleCount).toBe(0);
    expect(profile.dominantHooks).toEqual([]);
    expect(profile.vocabulary).toEqual([]);
  });

  it("reads a casual, urgent voice from sample ads", () => {
    const profile = deriveToneProfile([
      "Don't miss out! Get your plan now before it's gone!",
      "You're going to love this. Grab it today, last chance!",
    ]);
    expect(profile.sampleCount).toBe(2);
    expect(["casual", "conversational"]).toContain(profile.formality);
    expect(profile.descriptors.length).toBeGreaterThan(0);
    expect(profile.exclamationRate).toBeGreaterThan(0);
  });

  it("extracts repeated signature vocabulary", () => {
    const profile = deriveToneProfile([
      "Retirement income made simple for retirement savers.",
      "Plan your retirement income with confidence.",
    ]);
    expect(profile.vocabulary).toContain("retirement");
  });
});

describe("summarizeToneForPrompt", () => {
  it("is empty for an unlearned profile and descriptive otherwise", () => {
    expect(summarizeToneForPrompt(deriveToneProfile([]))).toBe("");
    const summary = summarizeToneForPrompt(deriveToneProfile(["Get the plan now. Trusted by thousands of retirees."]));
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.toLowerCase()).toContain("tone");
  });
});
