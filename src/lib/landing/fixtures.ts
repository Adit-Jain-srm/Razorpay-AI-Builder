import {
  DEMO_CAMPAIGN_ID,
  DEMO_CAMPAIGN_NAME,
  DEMO_LANDING_IDS,
  DEMO_LANDING_SLUG,
  DEMO_PAIN_POINTS,
  DEMO_USER_ID,
} from "@/lib/seed/constants";

import { buildLandingDocument, resetSectionSequence, type LandingContext } from "./templates";
import type { ExperimentMeta, LandingDocument } from "./types";

/**
 * Seeded Landing Page Engine fixtures for the financial-newsletter vertical
 * ("Retirement Income Weekly"), reusing the same demo campaign as the Creative
 * Studio so the demo narrative is coherent across modules.
 *
 * These power the credential-free demo: a real, deployed A/B experiment (two
 * squeeze variants testing distinct angles) with realistic view/lead counts so
 * the editor's conversion stats and auto-promote-winner are demoable, and the
 * public `/lp/[slug]` route serves them with anonymous lead capture.
 *
 * PURE + client-safe.
 */

export { DEMO_CAMPAIGN_ID, DEMO_CAMPAIGN_NAME };
export const DEMO_LANDING_USER_ID = DEMO_USER_ID;

/** The shared experiment key linking the two demo variants. */
export const DEMO_EXPERIMENT_KEY = "exp-retirement-hero";

/** Finance context for the demo campaign - reused by the generation fallback. */
export const DEMO_FINANCE_CONTEXT: LandingContext = {
  brandName: DEMO_CAMPAIGN_NAME,
  vertical: "financial newsletter for near-retirees",
  productName: DEMO_CAMPAIGN_NAME,
  angle: "no-upsell trust",
  audience: "near-retirees worried about inflation",
  painPoints: [...DEMO_PAIN_POINTS],
  benefits: [
    "A plain-English income plan you can actually follow",
    "Strategies built to keep pace with inflation",
    "Zero upsells, zero hype - just the plan",
  ],
  offer: "the free 2026 retirement income guide",
};

export interface DemoLandingSeed {
  id: string;
  slug: string;
  status: "draft" | "deployed" | "paused";
  document: LandingDocument;
  deployedAt: string | null;
  /** Seeded analytics so conversion stats + winner heuristic are demoable. */
  views: number;
  leads: number;
  createdAt: string;
}

interface VariantSpec {
  id: string;
  slug: string;
  angle: string;
  headline: string;
  subheadline: string;
  label: string;
  weight: number;
  isControl: boolean;
  views: number;
  leads: number;
}

const VARIANT_SPECS: VariantSpec[] = [
  {
    id: DEMO_LANDING_IDS.VARIANT_A,
    slug: DEMO_LANDING_SLUG,
    angle: "no-upsell trust",
    headline: "The plain-English retirement income plan - with zero upsells",
    subheadline:
      "Get the free 2026 guide near-retirees actually trust. No jargon, no fear-mongering, no 'secret' pick that turns into a pitch.",
    label: "A - No-upsell trust",
    weight: 50,
    isControl: true,
    views: 486,
    leads: 61,
  },
  {
    id: DEMO_LANDING_IDS.VARIANT_B,
    slug: "retirement-income-inflation",
    angle: "beat inflation",
    headline: "Is inflation quietly shrinking your retirement? Here's the plan.",
    subheadline:
      "The free 2026 income guide that shows near-retirees how to keep their nest egg ahead of rising prices - in plain English.",
    label: "B - Inflation fear",
    weight: 50,
    isControl: false,
    views: 472,
    leads: 80,
  },
];

const CREATED_AT = "2026-06-20T12:00:00.000Z";
const DEPLOYED_AT = "2026-06-21T09:00:00.000Z";

function buildVariant(spec: VariantSpec): DemoLandingSeed {
  resetSectionSequence(VARIANT_SPECS.indexOf(spec) * 100);
  const experiment: ExperimentMeta = {
    key: DEMO_EXPERIMENT_KEY,
    label: spec.label,
    weight: spec.weight,
    isControl: spec.isControl,
    promotedAt: null,
  };
  const document = buildLandingDocument(
    "squeeze",
    { ...DEMO_FINANCE_CONTEXT, angle: spec.angle },
    {
      source: "seeded",
      experiment,
      copy: { heroHeadline: spec.headline, heroSubheadline: spec.subheadline },
    },
  );
  return {
    id: spec.id,
    slug: spec.slug,
    status: "deployed",
    document,
    deployedAt: DEPLOYED_AT,
    views: spec.views,
    leads: spec.leads,
    createdAt: CREATED_AT,
  };
}

/** Builds the seeded demo landing pages (one deployed A/B experiment). */
export function buildSeededLandingPages(): DemoLandingSeed[] {
  return VARIANT_SPECS.map(buildVariant);
}
