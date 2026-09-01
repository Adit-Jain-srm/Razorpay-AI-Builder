import { describe, expect, it } from "vitest";

import { campaignBriefSchema, leadCaptureSchema, loginSchema, researchQuerySchema } from ".";

const VALID_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("loginSchema", () => {
  it("accepts a valid email + password", () => {
    expect(loginSchema.safeParse({ email: "buyer@example.com", password: "supersecret" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "supersecret" }).success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(loginSchema.safeParse({ email: "buyer@example.com", password: "short" }).success).toBe(false);
  });
});

describe("campaignBriefSchema", () => {
  it("accepts a minimal brief and applies array defaults", () => {
    const result = campaignBriefSchema.safeParse({ objective: "Drive newsletter signups" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valueProps).toEqual([]);
      expect(result.data.platforms).toEqual([]);
    }
  });

  it("accepts known ad platforms", () => {
    expect(campaignBriefSchema.safeParse({ objective: "Launch", platforms: ["meta", "google"] }).success).toBe(true);
  });

  it("rejects an empty objective", () => {
    expect(campaignBriefSchema.safeParse({ objective: "" }).success).toBe(false);
  });

  it("rejects an unknown ad platform", () => {
    expect(campaignBriefSchema.safeParse({ objective: "Launch", platforms: ["myspace"] }).success).toBe(false);
  });
});

describe("leadCaptureSchema", () => {
  it("accepts a valid lead", () => {
    expect(leadCaptureSchema.safeParse({ landingPageId: VALID_UUID, email: "lead@example.com" }).success).toBe(true);
  });

  it("rejects a non-uuid landing page id", () => {
    expect(leadCaptureSchema.safeParse({ landingPageId: "not-a-uuid", email: "lead@example.com" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(leadCaptureSchema.safeParse({ landingPageId: VALID_UUID, email: "nope" }).success).toBe(false);
  });
});

describe("researchQuerySchema", () => {
  it("accepts a non-empty query", () => {
    expect(researchQuerySchema.safeParse({ query: "near-retirees worried about inflation" }).success).toBe(true);
  });

  it("rejects an empty query", () => {
    expect(researchQuerySchema.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects a limit above the maximum", () => {
    expect(researchQuerySchema.safeParse({ query: "x", limit: 1000 }).success).toBe(false);
  });

  it("rejects a non-integer limit", () => {
    expect(researchQuerySchema.safeParse({ query: "x", limit: 3.5 }).success).toBe(false);
  });
});
