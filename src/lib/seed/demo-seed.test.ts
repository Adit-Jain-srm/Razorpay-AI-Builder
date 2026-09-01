import { describe, expect, it } from "vitest";

import { buildSeededCreatives, DEMO_CAMPAIGN_ID as CREATIVE_CAMPAIGN_ID } from "@/lib/creative/fixtures";
import { buildSeededLandingPages, DEMO_CAMPAIGN_ID as LANDING_CAMPAIGN_ID } from "@/lib/landing/fixtures";
import {
  DEMO_CAMPAIGN_ID,
  DEMO_CREATIVE_IDS,
  DEMO_LANDING_IDS,
  DEMO_LANDING_SLUG,
  DEMO_RESEARCH_PROJECT_ID,
  DEMO_USER_ID,
} from "@/lib/seed/constants";
import { buildDemoSeedTargets, ANALYTICS_DEMO_CAMPAIGN_ID } from "@/lib/seed/targets";

import { getDemoSeedIdentity, validateDemoSeedConsistency } from "./demo-seed";

describe("demo-seed consistency", () => {
  it("all canonical ids are valid UUIDs", () => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(DEMO_CAMPAIGN_ID).toMatch(uuidRe);
    expect(DEMO_USER_ID).toMatch(uuidRe);
    expect(DEMO_RESEARCH_PROJECT_ID).toMatch(uuidRe);
    for (const id of Object.values(DEMO_CREATIVE_IDS)) {
      expect(id).toMatch(uuidRe);
    }
    for (const id of Object.values(DEMO_LANDING_IDS)) {
      expect(id).toMatch(uuidRe);
    }
  });

  it("creative fixtures use the canonical campaign id", () => {
    expect(CREATIVE_CAMPAIGN_ID).toBe(DEMO_CAMPAIGN_ID);
  });

  it("landing fixtures use the canonical campaign id", () => {
    expect(LANDING_CAMPAIGN_ID).toBe(DEMO_CAMPAIGN_ID);
  });

  it("analytics seed targets use the canonical campaign id", () => {
    expect(ANALYTICS_DEMO_CAMPAIGN_ID).toBe(DEMO_CAMPAIGN_ID);
    const target = buildDemoSeedTargets();
    expect(target.campaignId).toBe(DEMO_CAMPAIGN_ID);
  });

  it("all canonical creative ids are present in buildSeededCreatives()", () => {
    const creatives = buildSeededCreatives();
    const creativeIds = creatives.map((c) => c.id);
    for (const id of Object.values(DEMO_CREATIVE_IDS)) {
      expect(creativeIds).toContain(id);
    }
  });

  it("all canonical landing ids are present in buildSeededLandingPages()", () => {
    const pages = buildSeededLandingPages();
    const pageIds = pages.map((p) => p.id);
    for (const id of Object.values(DEMO_LANDING_IDS)) {
      expect(pageIds).toContain(id);
    }
  });

  it("demo landing slug resolves", () => {
    const pages = buildSeededLandingPages();
    expect(pages.some((p) => p.slug === DEMO_LANDING_SLUG)).toBe(true);
  });

  it("analytics seed targets reference only canonical creative ids", () => {
    const target = buildDemoSeedTargets();
    const canonicalIds = new Set<string>(Object.values(DEMO_CREATIVE_IDS));
    for (const creative of target.creatives) {
      expect(canonicalIds.has(creative.id)).toBe(true);
    }
  });

  it("validateDemoSeedConsistency() returns no errors", () => {
    const errors = validateDemoSeedConsistency();
    expect(errors).toEqual([]);
  });

  it("getDemoSeedIdentity() returns the correct shape", () => {
    const identity = getDemoSeedIdentity();
    expect(identity.campaignId).toBe(DEMO_CAMPAIGN_ID);
    expect(identity.researchProjectId).toBe(DEMO_RESEARCH_PROJECT_ID);
    expect(identity.creativeIds).toHaveLength(Object.values(DEMO_CREATIVE_IDS).length);
    expect(identity.landingIds).toHaveLength(Object.values(DEMO_LANDING_IDS).length);
    expect(identity.landingSlug).toBe(DEMO_LANDING_SLUG);
    expect(identity.analyticsSeeded).toBe(true);
  });
});
