import { describe, expect, it } from "vitest";

import { classifyHookHeuristic, coerceHookType, scoreHooks } from "./hooks";
import { HOOK_TYPES } from "./types";

describe("classifyHookHeuristic", () => {
  const cases: { text: string; expected: string }[] = [
    { text: "Last chance - this offer ends today, act now before the deadline", expected: "urgency" },
    { text: "Rated #1 by thousands of happy customers and reviews", expected: "social_proof" },
    { text: "The secret nobody tells you about retirement, finally revealed", expected: "curiosity" },
    { text: "Don't miss out - everyone is switching while you still can", expected: "fomo" },
    { text: "Warning: inflation is quietly destroying your savings, don't lose your nest egg", expected: "fear" },
    { text: "Exclusive, members only invite for a select few insiders", expected: "exclusivity" },
  ];

  for (const { text, expected } of cases) {
    it(`classifies "${text.slice(0, 30)}..." as ${expected}`, () => {
      const result = classifyHookHeuristic(text);
      expect(result.type).toBe(expected);
      expect(result.confidence).toBeGreaterThan(0.35);
      expect(result.confidence).toBeLessThanOrEqual(0.98);
    });
  }

  it("defaults to curiosity with low confidence when no signal is present", () => {
    const result = classifyHookHeuristic("a plain neutral sentence about furniture");
    expect(result.type).toBe("curiosity");
    expect(result.confidence).toBeLessThan(0.35);
  });

  it("returns normalized per-mechanism scores that never exceed 1", () => {
    const result = classifyHookHeuristic("Warning: last chance, act now, exclusive secret");
    for (const type of HOOK_TYPES) {
      expect(result.scores[type]).toBeGreaterThanOrEqual(0);
      expect(result.scores[type]).toBeLessThanOrEqual(1);
    }
  });
});

describe("scoreHooks", () => {
  it("does not match short words inside longer words (word boundaries)", () => {
    // "knowledge" contains "now" but must not register as urgency.
    const scores = scoreHooks("share your knowledge");
    expect(scores.urgency).toBe(0);
  });
});

describe("coerceHookType", () => {
  it("maps aliases and rejects unknown values", () => {
    expect(coerceHookType("FOMO")).toBe("fomo");
    expect(coerceHookType("fear of missing out")).toBe("fomo");
    expect(coerceHookType("scarcity")).toBe("urgency");
    expect(coerceHookType("authority")).toBe("social_proof");
    expect(coerceHookType("Exclusive")).toBe("exclusivity");
    expect(coerceHookType("social proof")).toBe("social_proof");
    expect(coerceHookType("nonsense")).toBeNull();
  });
});
