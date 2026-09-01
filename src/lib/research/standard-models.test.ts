import { describe, expect, it } from "vitest";

import { buildSeededReport } from "./fixtures";
import {
  audienceSegmentSchema,
  competitorAdSchema,
  opportunitySchema,
  queryParamsSchema,
  researchReportSchema,
  standardModelSchema,
} from "./standard-models";

describe("queryParamsSchema", () => {
  it("requires a non-empty query", () => {
    expect(queryParamsSchema.safeParse({ query: "" }).success).toBe(false);
    expect(queryParamsSchema.safeParse({ query: "near-retirees" }).success).toBe(true);
  });

  it("caps limit at 100", () => {
    expect(queryParamsSchema.safeParse({ query: "x", limit: 250 }).success).toBe(false);
  });
});

describe("audienceSegmentSchema defaults", () => {
  it("fills nested defaults from a minimal persona", () => {
    const parsed = audienceSegmentSchema.parse({ name: "Persona" });
    expect(parsed.psychographics.painPoints).toEqual([]);
    expect(parsed.behaviors.platforms).toEqual([]);
    expect(parsed.sources).toEqual([]);
    expect(parsed.demographics).toEqual({});
  });
});

describe("competitorAdSchema", () => {
  it("defaults hooksUsed and sources", () => {
    const parsed = competitorAdSchema.parse({ platform: "meta" });
    expect(parsed.hooksUsed).toEqual([]);
    expect(parsed.sources).toEqual([]);
  });

  it("rejects an invalid image url", () => {
    expect(competitorAdSchema.safeParse({ platform: "meta", imageUrl: "not-a-url" }).success).toBe(false);
  });
});

describe("opportunitySchema", () => {
  it("accepts valid types and rejects unknown ones", () => {
    expect(opportunitySchema.safeParse({ title: "t", rationale: "r", type: "messaging_gap" }).success).toBe(true);
    expect(opportunitySchema.safeParse({ title: "t", rationale: "r", type: "nope" }).success).toBe(false);
  });
});

describe("standardModelSchema discriminated union", () => {
  it("parses a tagged pain_point and rejects an unknown kind", () => {
    expect(standardModelSchema.safeParse({ kind: "pain_point", data: { summary: "s" } }).success).toBe(true);
    expect(standardModelSchema.safeParse({ kind: "unknown", data: {} }).success).toBe(false);
  });
});

describe("researchReportSchema", () => {
  it("validates the seeded report and defaults opportunities", () => {
    const report = buildSeededReport();
    const parsed = researchReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
    expect(report.opportunities.length).toBeGreaterThan(0);
    expect(report.segments.length).toBeGreaterThan(0);
  });
});
