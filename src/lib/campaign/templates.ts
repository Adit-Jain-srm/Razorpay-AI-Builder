import type { AdPlatform } from "@/lib/research/standard-models";

import type {
  BudgetPlan,
  CampaignBriefData,
  PersonaSnapshot,
  PlatformConfig,
  PlatformRecommendation,
} from "./brief";

/**
 * Campaign templates - opinionated, ready-to-edit starting points for the three
 * verticals the brief asks for (financial newsletter, ecommerce, SaaS). A
 * template pre-fills the entire builder (brief + platforms + budget) with a
 * coherent, direct-response-savvy default so a user can go from zero to a
 * credible draft in one click, then refine.
 *
 * Pure data + a single `applyTemplate` selector. No DB / AI access.
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  /** Suggested campaign name when the template is applied. */
  campaignName: string;
  tagline: string;
  /** One-letter/short glyph for the gallery card (icon chosen in the UI layer). */
  vertical: "finance" | "ecommerce" | "saas";
  brief: CampaignBriefData;
  platformConfig: PlatformConfig;
  budget: BudgetPlan;
}

/** A builder seed produced from a template (ready to feed the brief builder). */
export interface CampaignSeed {
  name: string;
  brief: CampaignBriefData;
  platformConfig: PlatformConfig;
  budget: BudgetPlan;
}

interface PersonaInput {
  id: string;
  name: string;
  summary?: string;
  ageRange?: string;
  incomeBracket?: string;
  location?: string;
  painPoints?: string[];
  platforms?: string[];
  sizeRange?: string;
}

function persona(input: PersonaInput): PersonaSnapshot {
  return {
    id: input.id,
    name: input.name,
    summary: input.summary ?? "",
    ageRange: input.ageRange,
    incomeBracket: input.incomeBracket,
    location: input.location,
    painPoints: input.painPoints ?? [],
    platforms: input.platforms ?? [],
    sizeRange: input.sizeRange,
    source: "manual",
  };
}

function recommend(platform: AdPlatform, fit: number, rationale: string): PlatformRecommendation {
  return { platform, fit, rationale };
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

const financialNewsletter: CampaignTemplate = {
  id: "financial-newsletter",
  name: "Financial newsletter",
  campaignName: "Retirement Income Weekly",
  tagline: "Lead-gen funnel for a subscription finance newsletter.",
  vertical: "finance",
  brief: {
    objective: "leads",
    product: "A plain-English retirement income newsletter for near-retirees",
    offer: "Free 2026 Inflation-Proof Income Blueprint (instant download)",
    audience: "US near-retirees aged 55-67 worried inflation will erode their savings",
    valueProps: [
      "No jargon, no relentless upsells - just a plan you can trust",
      "Income ideas designed to keep pace with inflation",
      "Built specifically for people approaching retirement",
    ],
    tone: "trustworthy, plain-English, reassuring (security over hype)",
    notes: "Lead with trust and inflation-protection; avoid greed/curiosity hooks competitors overuse.",
    personas: [
      persona({
        id: "template:financial:inflation-anxious",
        name: "Inflation-Anxious Pre-Retiree",
        summary: "Fears inflation will erode savings before retirement and distrusts hypey newsletters.",
        ageRange: "58-64",
        incomeBracket: "$75k-$150k household",
        location: "US suburban / Sun Belt",
        painPoints: [
          "Inflation eroding savings before retirement",
          "Distrust of upsell-heavy newsletters",
          "Financial jargon overwhelm",
        ],
        platforms: ["facebook", "youtube", "email"],
        sizeRange: "4.2M-5.8M US near-retirees",
      }),
      persona({
        id: "template:financial:dividend-seeker",
        name: "Self-Directed Dividend Seeker",
        summary: "Wants durable income without drawing down principal; skeptical of annuities.",
        ageRange: "55-68",
        incomeBracket: "$120k-$250k investable",
        location: "US nationwide",
        painPoints: ["Income without selling principal", "Skeptical of annuities", "Sequence-of-returns risk"],
        platforms: ["reddit", "youtube", "email"],
        sizeRange: "1.6M-2.4M self-directed near-retirees",
      }),
    ],
    source: "template",
  },
  platformConfig: {
    platforms: ["meta", "taboola", "google"],
    recommendations: [
      recommend("meta", 88, "Detailed-targeting reach to 55+ with strong long-form lead-gen creative."),
      recommend("taboola", 80, "Native advertorials convert this audience on finance publishers they already read."),
      recommend("google", 76, "Captures high-intent 'retirement income' and 'inflation protection' search demand."),
      recommend("youtube", 60, "Explainer pre-roll builds trust but is a secondary, higher-CPA channel."),
      recommend("linkedin", 38, "Audience skews retired, not professional - weak fit."),
      recommend("tiktok", 28, "Demographic mismatch for near-retirees."),
    ],
    source: "template",
  },
  budget: {
    total: 6000,
    currency: "USD",
    allocations: [
      { platform: "meta", percent: 45, rationale: "Primary lead-gen workhorse." },
      { platform: "taboola", percent: 30, rationale: "Native scale on finance sites." },
      { platform: "google", percent: 25, rationale: "High-intent capture." },
    ],
    source: "template",
  },
};

const ecommerce: CampaignTemplate = {
  id: "ecommerce",
  name: "Ecommerce launch",
  campaignName: "DTC Product Launch",
  tagline: "Direct-response sales funnel for a consumer product.",
  vertical: "ecommerce",
  brief: {
    objective: "sales",
    product: "A direct-to-consumer physical product",
    offer: "20% off your first order + free shipping",
    audience: "Online shoppers who buy from social and value reviews and fast shipping",
    valueProps: ["Fast, free shipping", "Risk-free 30-day returns", "Loved by 10,000+ customers"],
    tone: "energetic, social-proof-led, benefit-forward",
    notes: "Pair UGC-style video with a clear discount hook; retarget add-to-cart.",
    personas: [
      persona({
        id: "template:ecommerce:social-shopper",
        name: "Social-First Deal Shopper",
        summary: "Discovers products in-feed, converts on social proof and a clear first-order incentive.",
        ageRange: "25-44",
        incomeBracket: "$45k-$110k household",
        location: "US metro",
        painPoints: ["Skeptical of unknown brands", "Hates paying for shipping", "Wants proof it works"],
        platforms: ["tiktok", "facebook", "instagram"],
        sizeRange: "Broad consumer segment",
      }),
    ],
    source: "template",
  },
  platformConfig: {
    platforms: ["meta", "tiktok", "google"],
    recommendations: [
      recommend("meta", 86, "Advantage+ shopping + retargeting is the DTC conversion backbone."),
      recommend("tiktok", 82, "UGC-native video drives cheap discovery and impulse purchases."),
      recommend("google", 78, "Shopping + branded search captures bottom-of-funnel demand."),
      recommend("youtube", 58, "Shorts retargeting extends video reach at higher CPA."),
      recommend("taboola", 50, "Native works for advertorials but trails social for DTC."),
      recommend("x", 38, "Limited commerce intent for most consumer products."),
    ],
    source: "template",
  },
  budget: {
    total: 8000,
    currency: "USD",
    allocations: [
      { platform: "meta", percent: 40, rationale: "Highest-ROAS conversion channel." },
      { platform: "tiktok", percent: 35, rationale: "Cheap top-funnel discovery." },
      { platform: "google", percent: 25, rationale: "Capture branded + shopping intent." },
    ],
    source: "template",
  },
};

const saas: CampaignTemplate = {
  id: "saas",
  name: "B2B SaaS",
  campaignName: "B2B SaaS Demo Gen",
  tagline: "Trial/demo lead-gen funnel for a software product.",
  vertical: "saas",
  brief: {
    objective: "leads",
    product: "A B2B SaaS platform sold to operators and teams",
    offer: "Free 14-day trial - no credit card required",
    audience: "Operators, founders, and team leads evaluating tooling to save time",
    valueProps: ["Set up in minutes", "Integrates with your existing stack", "Cancel anytime"],
    tone: "credible, ROI-focused, concise (proof over hype)",
    notes: "Lead with the job-to-be-done and time saved; gate a high-value asset for MQLs.",
    personas: [
      persona({
        id: "template:saas:ops-lead",
        name: "Time-Strapped Operations Lead",
        summary: "Evaluates tools that remove manual work; needs proof of ROI and easy onboarding.",
        ageRange: "28-45",
        incomeBracket: "B2B decision-maker",
        location: "US / EU, remote-friendly",
        painPoints: ["Manual, repetitive work", "Tool sprawl and bad integrations", "Hard to prove ROI internally"],
        platforms: ["google", "linkedin", "youtube"],
        sizeRange: "Niche professional segment",
      }),
    ],
    source: "template",
  },
  platformConfig: {
    platforms: ["google", "linkedin", "meta"],
    recommendations: [
      recommend("google", 88, "High-intent search for the category and competitor terms drives qualified trials."),
      recommend("linkedin", 82, "Precise job-title/company targeting reaches B2B buyers other channels can't."),
      recommend("meta", 70, "Cost-effective retargeting and lookalikes off your trial audience."),
      recommend("youtube", 60, "Product demos and explainer pre-roll nurture mid-funnel."),
      recommend("x", 48, "Founder/operator communities for thought-leadership distribution."),
      recommend("tiktok", 30, "Weak B2B intent for most software buyers."),
    ],
    source: "template",
  },
  budget: {
    total: 10000,
    currency: "USD",
    allocations: [
      { platform: "google", percent: 45, rationale: "Highest-intent qualified trials." },
      { platform: "linkedin", percent: 35, rationale: "Precise B2B targeting." },
      { platform: "meta", percent: 20, rationale: "Retargeting + lookalikes." },
    ],
    source: "template",
  },
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [financialNewsletter, ecommerce, saas];

/** Look up a template by id. */
export function getTemplate(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((template) => template.id === id);
}

/**
 * Produce a builder seed from a template id. Returns `null` for an unknown id so
 * callers can fall back to an empty draft. Deep-clones so the builder can mutate
 * the seed freely without touching the shared template constant.
 */
export function applyTemplate(id: string): CampaignSeed | null {
  const template = getTemplate(id);
  if (!template) return null;
  return structuredClone({
    name: template.campaignName,
    brief: template.brief,
    platformConfig: template.platformConfig,
    budget: template.budget,
  });
}
