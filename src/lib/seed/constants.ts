/**
 * Canonical demo identity - the ONE source of truth for all demo data across
 * every MediaOS module. Import from here, never define module-local demo ids.
 *
 * These ids are stable UUIDs (v4-shaped) so they pass `z.uuid()` validators and
 * resolve across cold starts. The single campaign represents the "Retirement
 * Income Weekly" financial-newsletter scenario judges see in <30s.
 *
 * PURE + client-safe (no server imports, no side effects).
 */

/** The single demo campaign that every module references. */
export const DEMO_CAMPAIGN_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_CAMPAIGN_NAME = "Retirement Income Weekly";

/** Stable user id for RLS-compatible seeding (all demo rows share this owner). */
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000099";

/** The research project linked to the demo campaign. */
export const DEMO_RESEARCH_PROJECT_ID = "00000000-0000-4000-8000-000000000002";

/** Creative IDs - stable across modules so analytics metrics resolve to real creatives. */
export const DEMO_CREATIVE_IDS = {
  META_HERO: "d0000000-0000-4000-8000-000000000011",
  META_VARIANT_B: "d0000000-0000-4000-8000-000000000012",
  META_FRESH: "d0000000-0000-4000-8000-000000000013",
  GOOGLE_RSA: "d0000000-0000-4000-8000-000000000021",
  TIKTOK_HOOK: "d0000000-0000-4000-8000-000000000031",
  TABOOLA_A: "d0000000-0000-4000-8000-000000000041",
  TABOOLA_B: "d0000000-0000-4000-8000-000000000042",
} as const;

/** Landing page IDs for the A/B experiment. */
export const DEMO_LANDING_IDS = {
  VARIANT_A: "d1000000-0000-4000-8000-000000000001",
  VARIANT_B: "d1000000-0000-4000-8000-000000000002",
} as const;

/** The public slug where the demo landing page is deployed. */
export const DEMO_LANDING_SLUG = "retirement-income-weekly";

/* -------------------------------------------------------------------------- */
/* Wave 7: AarogyaFit (Track 01 canonical demo merchant)                     */
/* -------------------------------------------------------------------------- */

/** The Track 01 demo campaign (AarogyaFit, INR). */
export const DEMO_TRACK01_CAMPAIGN_ID = "00000000-0000-4000-8000-000000000010";
export const DEMO_TRACK01_CAMPAIGN_NAME = "AarogyaFit Growth Campaign";
export const DEMO_TRACK01_LANDING_SLUG = "aarogya-fit";

/** Stable landing page ID for the AarogyaFit checkout page. */
export const DEMO_TRACK01_LANDING_ID = "d2000000-0000-4000-8000-000000000001";

/** AarogyaFit product SKUs (must match src/lib/payments/products.ts). */
export const DEMO_TRACK01_SKUS = {
  PROGRAM: "AAROGYA-12W",
  NUTRITION: "AAROGYA-NUTR",
  BUNDLE: "AAROGYA-BUNDLE",
} as const;

/** Pain points for the AarogyaFit audience. */
export const DEMO_TRACK01_PAIN_POINTS = [
  "Inconsistent workout routines that never stick past week 3",
  "Confusion about nutrition — too many conflicting diets online",
  "Gym intimidation and not knowing where to start",
  "Spending on supplements without understanding if they work",
] as const;

/** Pain points used across research, creatives, and landing copy. */
export const DEMO_PAIN_POINTS = [
  "Inflation eroding savings before retirement",
  "Distrust of upsell-heavy newsletters",
  "Fear of not affording to retire on time",
  "Overwhelmed by financial jargon",
] as const;

/** Brand vocabulary the demo copy targets. */
export const DEMO_VOCAB = [
  "nest egg",
  "plain-English",
  "no-upsell",
  "near-retirees",
  "inflation",
  "income",
] as const;
