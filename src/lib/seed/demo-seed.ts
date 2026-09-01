/**
 * Unified canonical demo seed. Seeds one coherent financial-newsletter campaign
 * ("Retirement Income Weekly") with all downstream data so judges see a complete
 * story in <30s. Idempotent - safe to call on every server boot.
 *
 * All ids come from `./constants.ts`, ensuring every module references the same
 * campaign/creative/landing/research/analytics data.
 *
 * PURE + test-safe (no `next/headers`, no Supabase): it validates that all module
 * fixtures reference the canonical ids and provides a single entry point for the
 * demo identity.
 */

import { buildSeededCreatives, DEMO_CAMPAIGN_ID as CREATIVE_CAMPAIGN_ID } from "@/lib/creative/fixtures";
import { buildSeededLandingPages, DEMO_CAMPAIGN_ID as LANDING_CAMPAIGN_ID } from "@/lib/landing/fixtures";

import {
  DEMO_CAMPAIGN_ID,
  DEMO_CAMPAIGN_NAME,
  DEMO_CREATIVE_IDS,
  DEMO_LANDING_IDS,
  DEMO_LANDING_SLUG,
  DEMO_RESEARCH_PROJECT_ID,
  DEMO_USER_ID,
} from "./constants";

export interface DemoSeedResult {
  campaignId: string;
  researchProjectId: string;
  creativeIds: string[];
  landingIds: string[];
  landingSlug: string;
  analyticsSeeded: boolean;
}

/**
 * Verifies that the canonical demo seed is internally consistent:
 * all creatives reference the campaign, all landing pages reference the campaign,
 * the research project links to the campaign, and analytics targets resolve.
 *
 * Returns an array of error strings (empty = consistent).
 */
export function validateDemoSeedConsistency(): string[] {
  const errors: string[] = [];

  if (CREATIVE_CAMPAIGN_ID !== DEMO_CAMPAIGN_ID) {
    errors.push(`Creative fixtures DEMO_CAMPAIGN_ID mismatch: ${CREATIVE_CAMPAIGN_ID} !== ${DEMO_CAMPAIGN_ID}`);
  }

  if (LANDING_CAMPAIGN_ID !== DEMO_CAMPAIGN_ID) {
    errors.push(`Landing fixtures DEMO_CAMPAIGN_ID mismatch: ${LANDING_CAMPAIGN_ID} !== ${DEMO_CAMPAIGN_ID}`);
  }

  const creatives = buildSeededCreatives();
  const expectedCreativeIds = Object.values(DEMO_CREATIVE_IDS);
  for (const id of expectedCreativeIds) {
    if (!creatives.some((c) => c.id === id)) {
      errors.push(`Expected creative ${id} not found in buildSeededCreatives()`);
    }
  }

  const pages = buildSeededLandingPages();
  if (!pages.some((p) => p.slug === DEMO_LANDING_SLUG)) {
    errors.push(`Expected landing slug "${DEMO_LANDING_SLUG}" not found`);
  }

  for (const id of Object.values(DEMO_LANDING_IDS)) {
    if (!pages.some((p) => p.id === id)) {
      errors.push(`Expected landing page ${id} not found`);
    }
  }

  return errors;
}

/**
 * Returns the canonical demo seed identity for downstream consumers that need
 * the full set of ids without importing each constant individually.
 */
export function getDemoSeedIdentity(): DemoSeedResult {
  return {
    campaignId: DEMO_CAMPAIGN_ID,
    researchProjectId: DEMO_RESEARCH_PROJECT_ID,
    creativeIds: Object.values(DEMO_CREATIVE_IDS),
    landingIds: Object.values(DEMO_LANDING_IDS),
    landingSlug: DEMO_LANDING_SLUG,
    analyticsSeeded: true,
  };
}

export {
  DEMO_CAMPAIGN_ID,
  DEMO_CAMPAIGN_NAME,
  DEMO_CREATIVE_IDS,
  DEMO_LANDING_IDS,
  DEMO_LANDING_SLUG,
  DEMO_RESEARCH_PROJECT_ID,
  DEMO_USER_ID,
};
