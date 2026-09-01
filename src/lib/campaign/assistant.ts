import { z } from "zod";

import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { FINANCIAL_NEWSLETTER_KEYWORDS, personasFixture } from "@/lib/research/fixtures";
import { AD_PLATFORMS, adPlatformSchema, type AdPlatform, type AudienceSegment } from "@/lib/research/standard-models";

import {
  budgetAllocationSchema,
  normalizeAllocations,
  personaSnapshotSchema,
  platformRecommendationSchema,
  type BriefAssistResult,
  type BudgetAllocation,
  type BudgetSuggestion,
  type PersonaSnapshot,
  type PlatformRecommendation,
} from "./brief";

export type { BriefAssistResult, BudgetSuggestion } from "./brief";

/**
 * AI Campaign Brief Assistant - turns a short product/offer description into a
 * structured starting brief:
 *   (a) audience persona suggestions,
 *   (b) a platform recommendation engine (which of Google/Meta/TikTok/Taboola
 *       /YouTube/LinkedIn/X suit this offer, with a 0-100 fit + reasoning),
 *   (c) a budget allocation split across the recommended platforms.
 *
 * Mirrors the research analyzer's contract: every model response is parsed and
 * zod-validated before it is trusted, and when Azure is unconfigured (or a call
 * /parse fails) it degrades to a DETERMINISTIC, vertical-aware seeded result so
 * the builder always works - even with zero credentials. Pluggable singleton
 * (`getCampaignBriefAssistant` / `set` / `reset`) for tests and seeders.
 */

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

export interface BriefAssistInput {
  /** What is being advertised (required - the assistant is useless without it). */
  product: string;
  offer?: string;
  audience?: string;
  /** Objective hint (e.g. "leads", "sales"). */
  goal?: string;
  /** Personas already imported from research (used as grounding context). */
  personas?: PersonaSnapshot[];
  /** Platforms under consideration (used to scope a budget split). */
  platforms?: AdPlatform[];
  budgetTotal?: number;
  currency?: string;
  signal?: AbortSignal;
}

export interface CampaignBriefAssistant {
  assist(input: BriefAssistInput): Promise<BriefAssistResult>;
  suggestPersonas(input: BriefAssistInput): Promise<PersonaSnapshot[]>;
  recommendPlatforms(input: BriefAssistInput): Promise<PlatformRecommendation[]>;
  allocateBudget(input: BriefAssistInput): Promise<BudgetSuggestion>;
}

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "persona"
  );
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** Best-effort JSON extraction from a model response (fences + surrounding prose). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output");
  const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));
  if (end <= start) throw new Error("Malformed JSON in model output");
  return JSON.parse(body.slice(start, end + 1));
}

type Vertical = "finance" | "ecommerce" | "saas" | "youth" | "general";

const VERTICAL_KEYWORDS: Record<Exclude<Vertical, "general">, string[]> = {
  finance: [...FINANCIAL_NEWSLETTER_KEYWORDS, "finance", "financial", "invest", "wealth", "money", "crypto", "trading", "insurance"],
  ecommerce: ["ecommerce", "e-commerce", "shop", "store", "product", "dtc", "apparel", "beauty", "fashion", "cosmetic", "skincare", "retail", "checkout", "cart", "subscription box"],
  saas: ["saas", "software", "b2b", "platform", "api", "developer", "enterprise", "crm", "dashboard", "workflow", "automation", "integration", "analytics tool"],
  youth: ["gen z", "genz", "teen", "student", "young", "trendy", "viral", "creator", "tiktok", "streetwear", "gaming"],
};

/** Per-platform baseline DR suitability before any vertical adjustment. */
const PLATFORM_BASE: Record<AdPlatform, number> = {
  meta: 70,
  google: 66,
  youtube: 52,
  tiktok: 50,
  taboola: 46,
  linkedin: 42,
  x: 38,
};

const VERTICAL_DELTAS: Record<Vertical, Partial<Record<AdPlatform, number>>> = {
  finance: { taboola: 32, meta: 16, google: 12, youtube: 6, tiktok: -22, linkedin: -2, x: -2 },
  ecommerce: { tiktok: 30, meta: 16, google: 12, youtube: 6, taboola: 4, linkedin: -16, x: -6 },
  saas: { linkedin: 38, google: 20, youtube: 8, x: 10, meta: 2, tiktok: -20, taboola: -10 },
  youth: { tiktok: 32, youtube: 14, meta: 8, x: 6, linkedin: -18, taboola: -8 },
  general: {},
};

const PLATFORM_RATIONALE: Record<AdPlatform, string> = {
  meta: "Broad reach with detailed targeting and the strongest direct-response creative ecosystem.",
  google: "Captures high-intent search demand at the bottom of the funnel.",
  tiktok: "Cheap top-of-funnel discovery through native, UGC-style video.",
  taboola: "Native advertorial placements on publisher sites that suit longer-form pitches.",
  youtube: "Video pre-roll for demonstration and trust-building; higher CPA, secondary role.",
  linkedin: "Precise job-title and company targeting for B2B buyers.",
  x: "Real-time, community-driven distribution for thought leadership.",
};

const VERTICAL_PLATFORM_NOTE: Partial<Record<Vertical, Partial<Record<AdPlatform, string>>>> = {
  finance: {
    taboola: "Finance audiences convert well on native advertorials they already read.",
    meta: "Detailed targeting reaches 55+ with long-form lead-gen creative.",
    tiktok: "Demographic mismatch for an older, finance-focused audience.",
  },
  ecommerce: {
    tiktok: "UGC video drives impulse discovery for consumer products.",
    meta: "Advantage+ shopping and retargeting are the DTC conversion backbone.",
  },
  saas: {
    linkedin: "Reaches B2B decision-makers other channels can't.",
    google: "High-intent category and competitor search drives qualified trials.",
    tiktok: "Weak B2B purchase intent for most software.",
  },
  youth: {
    tiktok: "Native to how this audience discovers and shares.",
  },
};

export function detectVertical(input: BriefAssistInput): Vertical {
  const hay = [input.product, input.offer, input.audience, input.goal].filter(Boolean).join(" ").toLowerCase();
  let best: Vertical = "general";
  let bestScore = 0;
  for (const [vertical, keywords] of Object.entries(VERTICAL_KEYWORDS) as [Exclude<Vertical, "general">, string[]][]) {
    const score = keywords.reduce((sum, keyword) => sum + (hay.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = vertical;
    }
  }
  return best;
}

/** Deterministic platform recommendations (ranked desc), vertical-aware. */
export function seededPlatforms(input: BriefAssistInput): PlatformRecommendation[] {
  const vertical = detectVertical(input);
  const deltas = VERTICAL_DELTAS[vertical];
  const recs = AD_PLATFORMS.map((platform) => {
    const fit = clamp(Math.round(PLATFORM_BASE[platform] + (deltas[platform] ?? 0)), 5, 98);
    const note = VERTICAL_PLATFORM_NOTE[vertical]?.[platform];
    const rationale = note ? `${PLATFORM_RATIONALE[platform]} ${note}` : PLATFORM_RATIONALE[platform];
    return platformRecommendationSchema.parse({ platform, fit, rationale });
  });
  return recs.sort((a, b) => b.fit - a.fit);
}

/** The platforms a budget split should cover: explicit > recommended top tier. */
function targetPlatforms(input: BriefAssistInput): AdPlatform[] {
  if (input.platforms && input.platforms.length > 0) {
    return [...new Set(input.platforms)];
  }
  return seededPlatforms(input)
    .filter((rec) => rec.fit >= 55)
    .slice(0, 3)
    .map((rec) => rec.platform);
}

/** Deterministic budget split: proportional to platform fit, normalized to 100. */
export function seededAllocations(input: BriefAssistInput): BudgetAllocation[] {
  const platforms = targetPlatforms(input);
  if (platforms.length === 0) return [];
  const recByPlatform = new Map(seededPlatforms(input).map((rec) => [rec.platform, rec.fit]));
  const raw = platforms.map((platform) =>
    budgetAllocationSchema.parse({
      platform,
      percent: recByPlatform.get(platform) ?? 50,
      rationale: PLATFORM_RATIONALE[platform],
    }),
  );
  return normalizeAllocations(raw);
}

function segmentToSuggestion(segment: AudienceSegment, index: number): PersonaSnapshot {
  return personaSnapshotSchema.parse({
    id: `ai:${slugify(segment.name)}:${index}`,
    name: segment.name,
    summary: segment.psychographics.painPoints[0] ?? segment.psychographics.aspirations[0] ?? "",
    ageRange: segment.demographics.ageRange,
    incomeBracket: segment.demographics.incomeBracket,
    location: segment.demographics.location,
    painPoints: segment.psychographics.painPoints,
    platforms: segment.behaviors.platforms,
    sizeRange: segment.sizeEstimate.range,
    source: "ai",
  });
}

/** Deterministic persona suggestions, grounded in imported personas or vertical. */
export function seededPersonas(input: BriefAssistInput): PersonaSnapshot[] {
  if (input.personas && input.personas.length > 0) {
    return input.personas.slice(0, 3);
  }
  if (detectVertical(input) === "finance") {
    return personasFixture.map((segment, i) => segmentToSuggestion(segment, i));
  }
  const audience = input.audience?.trim() || `people who need ${input.product || "this offer"}`;
  return [
    personaSnapshotSchema.parse({
      id: `ai:${slugify(audience)}:0`,
      name: `Core buyer: ${audience}`.slice(0, 60),
      summary: `Primary audience for ${input.product || "the offer"}${input.offer ? ` (${input.offer})` : ""}.`,
      painPoints: input.offer ? [`Wants the outcome behind "${input.offer}"`] : [],
      platforms: targetPlatforms(input),
      source: "ai",
    }),
  ];
}

function seededValueProps(input: BriefAssistInput): string[] {
  const props: string[] = [];
  if (input.offer) props.push(input.offer);
  if (input.product) props.push(`Built for ${input.audience?.trim() || "your audience"}`);
  props.push("Clear, credible proof over hype");
  return [...new Set(props)].slice(0, 4);
}

function seededResult(input: BriefAssistInput): BriefAssistResult {
  const platforms = seededPlatforms(input);
  const allocations = seededAllocations(input);
  return {
    objective: input.goal?.trim() || "leads",
    valueProps: seededValueProps(input),
    tone: detectVertical(input) === "finance" ? "trustworthy, plain-English, reassuring" : "clear, benefit-forward, credible",
    personas: seededPersonas(input),
    platforms,
    budget: {
      total: input.budgetTotal,
      currency: input.currency ?? "USD",
      allocations,
      source: "seeded",
    },
    source: "seeded",
  };
}

/* -------------------------------------------------------------------------- */
/* Model output schemas (lenient) + prompts                                   */
/* -------------------------------------------------------------------------- */

const modelPersonaSchema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
  ageRange: z.string().optional(),
  incomeBracket: z.string().optional(),
  location: z.string().optional(),
  painPoints: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
  sizeRange: z.string().optional(),
});

const modelPlatformSchema = z.object({
  platform: adPlatformSchema,
  fit: z.number(),
  rationale: z.string().optional(),
});

const modelAllocationSchema = z.object({
  platform: adPlatformSchema,
  percent: z.number(),
  rationale: z.string().optional(),
});

const modelAssistSchema = z.object({
  objective: z.string().optional(),
  valueProps: z.array(z.string()).default([]),
  tone: z.string().optional(),
  personas: z.array(modelPersonaSchema).default([]),
  platforms: z.array(modelPlatformSchema).default([]),
  budget: z
    .object({
      total: z.number().optional(),
      currency: z.string().optional(),
      allocations: z.array(modelAllocationSchema).default([]),
    })
    .optional(),
});

const ASSIST_SYSTEM = `You are a senior direct-response media strategist building a campaign brief.
From the supplied product/offer, produce a concise, decision-ready brief.
Recommend platforms ONLY from this set: google, meta, tiktok, taboola, youtube, linkedin, x.
"fit" is 0-100 (how well the platform suits THIS offer/audience). Budget "percent" values across platforms should sum to ~100.
Ground every persona in the offer/audience - do not invent unrelated facts.
Output ONLY a JSON object (no prose, no code fences) matching exactly:
{
  "objective": string,
  "valueProps": string[],
  "tone": string,
  "personas": [{ "name": string, "summary": string, "ageRange": string, "incomeBracket": string, "location": string, "painPoints": string[], "platforms": string[], "sizeRange": string }],
  "platforms": [{ "platform": string, "fit": number, "rationale": string }],
  "budget": { "total": number, "currency": string, "allocations": [{ "platform": string, "percent": number, "rationale": string }] }
}`;

function promptFromInput(input: BriefAssistInput): string {
  const lines = [
    `PRODUCT: ${input.product}`,
    input.offer ? `OFFER: ${input.offer}` : "",
    input.audience ? `AUDIENCE: ${input.audience}` : "",
    input.goal ? `OBJECTIVE: ${input.goal}` : "",
    input.budgetTotal ? `BUDGET TOTAL: ${input.budgetTotal} ${input.currency ?? "USD"}` : "",
    input.platforms?.length ? `PLATFORMS UNDER CONSIDERATION: ${input.platforms.join(", ")}` : "",
  ];
  if (input.personas?.length) {
    lines.push("", "PERSONAS ALREADY IMPORTED FROM RESEARCH:");
    for (const persona of input.personas.slice(0, 4)) {
      lines.push(`- ${persona.name}: ${persona.summary || persona.painPoints.join("; ")}`);
    }
  }
  return lines.filter(Boolean).join("\n");
}

/* -------------------------------------------------------------------------- */
/* Model output -> domain mapping                                             */
/* -------------------------------------------------------------------------- */

function mapPersonas(models: z.infer<typeof modelPersonaSchema>[]): PersonaSnapshot[] {
  return models.map((model, index) =>
    personaSnapshotSchema.parse({
      id: `ai:${slugify(model.name)}:${index}`,
      name: model.name,
      summary: model.summary ?? "",
      ageRange: model.ageRange,
      incomeBracket: model.incomeBracket,
      location: model.location,
      painPoints: model.painPoints,
      platforms: model.platforms,
      sizeRange: model.sizeRange,
      source: "ai",
    }),
  );
}

function mapPlatforms(models: z.infer<typeof modelPlatformSchema>[]): PlatformRecommendation[] {
  const seen = new Set<AdPlatform>();
  const recs: PlatformRecommendation[] = [];
  for (const model of models) {
    if (seen.has(model.platform)) continue;
    seen.add(model.platform);
    recs.push(
      platformRecommendationSchema.parse({
        platform: model.platform,
        fit: clamp(Math.round(model.fit), 0, 100),
        rationale: model.rationale ?? PLATFORM_RATIONALE[model.platform],
      }),
    );
  }
  return recs.sort((a, b) => b.fit - a.fit);
}

function mapAllocations(models: z.infer<typeof modelAllocationSchema>[]): BudgetAllocation[] {
  const seen = new Set<AdPlatform>();
  const allocations: BudgetAllocation[] = [];
  for (const model of models) {
    if (seen.has(model.platform)) continue;
    seen.add(model.platform);
    allocations.push(
      budgetAllocationSchema.parse({
        platform: model.platform,
        percent: clamp(model.percent, 0, 100),
        rationale: model.rationale ?? PLATFORM_RATIONALE[model.platform],
      }),
    );
  }
  return normalizeAllocations(allocations);
}

/* -------------------------------------------------------------------------- */
/* The assistant                                                              */
/* -------------------------------------------------------------------------- */

export class AiCampaignBriefAssistant implements CampaignBriefAssistant {
  /** Single combined model call so the whole brief is internally consistent. */
  async assist(input: BriefAssistInput): Promise<BriefAssistResult> {
    if (!input.product?.trim() || !isAzureConfigured()) return seededResult(input);

    try {
      const { text } = await generateChat({
        system: ASSIST_SYSTEM,
        prompt: promptFromInput(input),
        temperature: 0.5,
        maxOutputTokens: 2200,
        signal: input.signal,
      });
      const parsed = modelAssistSchema.safeParse(extractJson(text));
      if (!parsed.success) {
        logger.warn("Brief assist output invalid - using seeded fallback", { issues: parsed.error.issues.length });
        return seededResult(input);
      }
      const data = parsed.data;
      const platforms = data.platforms.length ? mapPlatforms(data.platforms) : seededPlatforms(input);
      const personas = data.personas.length ? mapPersonas(data.personas) : seededPersonas(input);
      const allocations = data.budget?.allocations.length ? mapAllocations(data.budget.allocations) : seededAllocations(input);
      return {
        objective: data.objective?.trim() || input.goal?.trim() || "leads",
        valueProps: data.valueProps.length ? data.valueProps.slice(0, 6) : seededValueProps(input),
        tone: data.tone?.trim() || "clear, benefit-forward, credible",
        personas,
        platforms,
        budget: {
          total: data.budget?.total ?? input.budgetTotal,
          currency: data.budget?.currency || input.currency || "USD",
          allocations,
          source: "ai",
        },
        source: "ai",
      };
    } catch (error) {
      logger.warn("Brief assist failed - using seeded fallback", { error: String(error) });
      return seededResult(input);
    }
  }

  async suggestPersonas(input: BriefAssistInput): Promise<PersonaSnapshot[]> {
    return (await this.assist(input)).personas;
  }

  async recommendPlatforms(input: BriefAssistInput): Promise<PlatformRecommendation[]> {
    if (!input.product?.trim() || !isAzureConfigured()) return seededPlatforms(input);
    return (await this.assist(input)).platforms;
  }

  async allocateBudget(input: BriefAssistInput): Promise<BudgetSuggestion> {
    if (!input.product?.trim() || !isAzureConfigured()) {
      return {
        total: input.budgetTotal,
        currency: input.currency ?? "USD",
        allocations: seededAllocations(input),
        source: "seeded",
      };
    }
    return (await this.assist(input)).budget;
  }
}

let assistant: CampaignBriefAssistant | null = null;

export function getCampaignBriefAssistant(): CampaignBriefAssistant {
  if (!assistant) assistant = new AiCampaignBriefAssistant();
  return assistant;
}

/** Install a deterministic assistant (tests / seeders). */
export function setCampaignBriefAssistant(custom: CampaignBriefAssistant): void {
  assistant = custom;
}

/** Reset to the default assistant. */
export function resetCampaignBriefAssistant(): void {
  assistant = null;
}
