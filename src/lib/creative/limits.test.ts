import { describe, expect, it } from "vitest";

import {
  buildField,
  buildRoleFields,
  collectFieldFlags,
  isVariantComplete,
  measureField,
  normalizeWhitespace,
  totalOverflow,
  truncateToLimit,
} from "./limits";
import { getPlatformSpec } from "./platforms";

describe("normalizeWhitespace", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(normalizeWhitespace("  hello   world \n there ")).toBe("hello world there");
  });
});

describe("truncateToLimit", () => {
  it("leaves text within the limit untouched", () => {
    expect(truncateToLimit("Short copy", 30)).toEqual({ text: "Short copy", truncated: false });
  });

  it("never returns more than the limit", () => {
    const limit = 30;
    const { text, truncated } = truncateToLimit("This headline is definitely much longer than thirty characters", limit);
    expect(text.length).toBeLessThanOrEqual(limit);
    expect(truncated).toBe(true);
  });

  it("prefers a word boundary instead of slicing mid-word", () => {
    const { text } = truncateToLimit("Beat inflation in retirement today", 20);
    expect(text.length).toBeLessThanOrEqual(20);
    // 20-char hard slice would be "Beat inflation in re"; word-boundary keeps whole words.
    expect(text).not.toMatch(/\sre$/);
    expect(text.endsWith(" ")).toBe(false);
  });

  it("hard-cuts when the limit is tiny", () => {
    const { text, truncated } = truncateToLimit("Subscribe", 4);
    expect(text.length).toBeLessThanOrEqual(4);
    expect(truncated).toBe(true);
  });

  it("treats a zero limit as empty", () => {
    expect(truncateToLimit("x", 0)).toEqual({ text: "", truncated: true });
  });
});

describe("buildField", () => {
  it("normalizes, enforces the limit, and reports flags", () => {
    const field = buildField("headline", "Headline 1", 30, "  Beat   inflation in retirement, starting right now today  ");
    expect(field.length).toBeLessThanOrEqual(30);
    expect(field.withinLimit).toBe(true);
    expect(field.truncated).toBe(true);
    expect(field.role).toBe("headline");
  });
});

describe("buildRoleFields", () => {
  const spec = getPlatformSpec("google").roles.find((r) => r.role === "headline")!;

  it("drops blanks, caps at spec.max, and labels each field", () => {
    const inputs = Array.from({ length: 20 }, (_, i) => (i % 5 === 0 ? "" : `Headline option number ${i}`));
    const fields = buildRoleFields(spec, inputs);
    expect(fields.length).toBeLessThanOrEqual(spec.max);
    expect(fields.every((f) => f.text.length > 0)).toBe(true);
    expect(fields.every((f) => f.length <= spec.limit)).toBe(true);
    expect(fields[0].label).toMatch(/Headline/);
  });
});

describe("measureField", () => {
  it("flags over-limit text without trimming it (live-edit mode)", () => {
    const field = measureField("headline", "Headline 1", 10, "way too long to fit");
    expect(field.text).toBe("way too long to fit");
    expect(field.withinLimit).toBe(false);
    expect(field.truncated).toBe(false);
  });
});

describe("collectFieldFlags + totalOverflow", () => {
  it("surfaces truncated and over-limit flags", () => {
    const truncated = buildField("headline", "H", 5, "Beat inflation now");
    const over = measureField("headline", "H", 5, "too long");
    expect(collectFieldFlags([truncated])).toContain("truncated");
    expect(collectFieldFlags([over])).toContain("over_limit");
    expect(totalOverflow([over])).toBeGreaterThan(0);
  });
});

describe("isVariantComplete", () => {
  it("requires the platform's minimum required fields", () => {
    const complete = [
      buildField("primary_text", "Primary text", 125, "A clear hook that fits."),
      buildField("headline", "Headline", 40, "Strong headline"),
    ];
    expect(isVariantComplete("meta", complete)).toBe(true);

    const missingHeadline = [buildField("primary_text", "Primary text", 125, "Only primary text")];
    expect(isVariantComplete("meta", missingHeadline)).toBe(false);
  });
});
