import { z } from "zod";

import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

import {
  buyingTriggersFixture,
  FINANCIAL_NEWSLETTER_KEYWORDS,
  opportunitiesFixture,
  painPointsFixture,
  personasFixture,
} from "./fixtures";
import {
  audienceSegmentSchema,
  opportunitySchema,
  opportunityTypeSchema,
  type AudienceSegment,
  type BuyingTrigger,
  type Opportunity,
  type PainPoint,
  type QueryParams,
  type ResearchResult,
  type SourceCitation,
} from "./standard-models";

export type { Opportunity, OpportunityType } from "./standard-models";

/**
 * AI analysis layer (Azure GPT-4o). Turns merged, multi-provider research into
 * actionable intelligence: synthesized personas, ranked pain points, buying
 * triggers, and opportunity detection - each carrying source citations.
 *
 * Resilience: when Azure is unconfigured (or a call/parse fails) the analyzer
 * degrades to high-quality SEEDED output derived from the providers' raw data so
 * the product still demos. ALL model output is parsed and zod-validated before
 * it is trusted; invalid output falls back rather than propagating.
 */

export interface AnalyzeInput {
  params: QueryParams;
  result: ResearchResult;
  signal?: AbortSignal;
}

export interface ResearchAnalyzer {
  synthesizePersonas(input: AnalyzeInput): Promise<AudienceSegment[]>;
  extractPainPoints(input: AnalyzeInput): Promise<PainPoint[]>;
  detectBuyingTriggers(input: AnalyzeInput): Promise<BuyingTrigger[]>;
  detectOpportunities(input: AnalyzeInput): Promise<Opportunity[]>;
}

/* -------------------------------------------------------------------------- */
/* Helpers (pure)                                                             */
/* -------------------------------------------------------------------------- */

/** True when the query is in the seeded financial-newsletter vertical. */
function matchesVertical(params: QueryParams): boolean {
  const hay = [params.query, params.industry, params.product, params.audienceHint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return FINANCIAL_NEWSLETTER_KEYWORDS.some((k) => hay.includes(k));
}

/** Deduplicated, representative citations to attach to a synthesized insight. */
function pickTopSources(result: ResearchResult, limit = 6): SourceCitation[] {
  const seen = new Set<string>();
  const out: SourceCitation[] = [];
  for (const source of result.sources) {
    const key = source.url ?? source.title ?? source.provider;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
    if (out.length >= limit) break;
  }
  return out;
}

/** Best-effort JSON extraction from a model response (handles code fences + prose). */
export function extractJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output");
  const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));
  if (end <= start) throw new Error("Malformed JSON in model output");
  return JSON.parse(body.slice(start, end + 1));
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Compact, token-friendly summary of the merged data for the model. */
function summarizeForPrompt(result: ResearchResult): string {
  const pains = result.painPoints.slice(0, 8).map((p) => `- ${p.summary}${p.quote ? ` ("${p.quote}")` : ""}`);
  const community = result.communityInsights.slice(0, 6).map((c) => `- [${c.platform}] ${c.content}`);
  const ads = result.competitorAds.slice(0, 8).map((a) => `- ${a.advertiser ?? "Unknown"} (${a.platform}): ${a.copy} [hooks: ${a.hooksUsed.join(", ")}]`);
  const trends = result.trends.slice(0, 8).map((t) => `- ${t.topic}${t.velocity ? ` (velocity ${t.velocity.toFixed(2)})` : ""}`);
  const triggers = result.buyingTriggers.slice(0, 6).map((t) => `- ${t.trigger} (${t.urgency ?? "n/a"})`);
  return [
    `QUERY: ${result.query.query}`,
    result.query.industry ? `INDUSTRY: ${result.query.industry}` : "",
    result.query.product ? `PRODUCT: ${result.query.product}` : "",
    "",
    "PAIN POINTS:",
    ...pains,
    "",
    "COMMUNITY VOICES:",
    ...community,
    "",
    "COMPETITOR ADS:",
    ...ads,
    "",
    "TRENDS:",
    ...trends,
    "",
    "BUYING TRIGGERS:",
    ...triggers,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/* Deterministic fallbacks (derived from real provider data)                  */
/* -------------------------------------------------------------------------- */

const KNOWN_PLATFORMS = new Set(["meta", "google", "tiktok", "youtube", "x", "linkedin", "reddit", "taboola"]);

function derivePersonaFromData(result: ResearchResult): AudienceSegment | null {
  const painSummaries = result.painPoints.slice(0, 4).map((p) => p.summary);
  const platforms = [
    ...new Set(
      [...result.communityInsights.map((c) => c.platform), ...result.competitorAds.map((a) => a.platform)].filter(
        (p): p is string => typeof p === "string" && KNOWN_PLATFORMS.has(p),
      ),
    ),
  ].slice(0, 5);
  const interests = result.trends.slice(0, 4).map((t) => t.topic);

  if (painSummaries.length === 0 && platforms.length === 0) return null;

  const label = result.query.audienceHint ?? result.query.query;
  return audienceSegmentSchema.parse({
    name: `Core segment: ${label}`,
    psychographics: {
      values: [],
      interests,
      painPoints: painSummaries,
      aspirations: [],
    },
    behaviors: {
      platforms,
      contentConsumption: [],
      purchasePatterns: [],
    },
    sources: pickTopSources(result, 5),
  });
}

function fallbackPersonas(result: ResearchResult): AudienceSegment[] {
  const derived = derivePersonaFromData(result);
  const vertical = matchesVertical(result.query) ? personasFixture : [];
  const combined = dedupeByName([...(derived ? [derived] : []), ...vertical]);
  return combined.length > 0 ? combined : personasFixture;
}

function fallbackPainPoints(result: ResearchResult): PainPoint[] {
  const fromProviders = [...result.painPoints];
  if (fromProviders.length === 0) {
    for (const insight of result.communityInsights) {
      fromProviders.push({
        summary: insight.painPointExtracted ?? insight.content.slice(0, 100),
        quote: insight.content,
        intensity: insight.sentiment !== undefined ? Math.min(1, Math.abs(insight.sentiment) + 0.3) : 0.5,
        frequency: 0.5,
        sources: insight.sources,
      });
    }
  }
  const ranked = fromProviders
    .map((p) => ({ p, score: (p.intensity ?? 0.5) * (p.frequency ?? 0.5) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
  const deduped = ranked.filter((p, i, arr) => arr.findIndex((q) => q.summary.toLowerCase() === p.summary.toLowerCase()) === i);
  if (deduped.length > 0) return deduped.slice(0, 10);
  return matchesVertical(result.query) ? painPointsFixture : [];
}

function fallbackBuyingTriggers(result: ResearchResult): BuyingTrigger[] {
  const fromProviders = result.buyingTriggers.filter(
    (t, i, arr) => arr.findIndex((q) => q.trigger.toLowerCase() === t.trigger.toLowerCase()) === i,
  );
  if (fromProviders.length > 0) return fromProviders.slice(0, 10);
  return matchesVertical(result.query) ? buyingTriggersFixture : [];
}

function heuristicOpportunities(result: ResearchResult): Opportunity[] {
  const opportunities: Opportunity[] = [];

  const topPain = [...result.painPoints].sort((a, b) => (b.intensity ?? 0) * (b.frequency ?? 0) - (a.intensity ?? 0) * (a.frequency ?? 0))[0];
  if (topPain) {
    opportunities.push({
      title: `Lead with the audience's loudest pain: "${topPain.summary}"`,
      rationale:
        "This is the highest intensity x frequency pain in the data. Few competitors address it head-on, so owning it is a high-pain / low-competition opening.",
      type: "high_pain_low_competition",
      confidence: 0.6,
      sources: topPain.sources,
    });
  }

  const topTrend = [...result.trends].sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))[0];
  if (topTrend && (topTrend.velocity ?? 0) > 0.3) {
    opportunities.push({
      title: `Ride the rising topic "${topTrend.topic}" before it saturates`,
      rationale: `"${topTrend.topic}" shows the strongest momentum (velocity ${(topTrend.velocity ?? 0).toFixed(2)}). Capturing it now positions ahead of slower competitors.`,
      type: "pre_saturation_trend",
      confidence: 0.55,
      sources: topTrend.sources,
    });
  }

  const competitorHooks = new Set(result.competitorAds.flatMap((a) => a.hooksUsed));
  const skewsGreed = competitorHooks.has("greed") || competitorHooks.has("curiosity");
  if (skewsGreed) {
    opportunities.push({
      title: "Open a trust-and-security messaging lane",
      rationale:
        "Competitor hooks skew to greed/curiosity while the audience's own language is fear and distrust. A security-and-trust angle is an underused lane that matches how they actually talk.",
      type: "messaging_gap",
      confidence: 0.58,
      sources: pickTopSources(result, 3),
    });
  }

  if (opportunities.length === 0) return matchesVertical(result.query) ? opportunitiesFixture : [];
  return opportunities;
}

/* -------------------------------------------------------------------------- */
/* The analyzer                                                               */
/* -------------------------------------------------------------------------- */

const PERSONA_SYSTEM = `You are a senior audience research strategist for a direct-response media buying team.
From the supplied research, synthesize 2-3 DISTINCT, vivid audience personas.
Ground every field in the provided pain points, community voices, competitor ads, and trends - do not invent facts.
Output ONLY a JSON array, no prose, no code fences, matching exactly:
[{
  "name": string,
  "demographics": { "ageRange": string, "genderSplit": string, "incomeBracket": string, "education": string, "location": string },
  "psychographics": { "values": string[], "interests": string[], "painPoints": string[], "aspirations": string[] },
  "behaviors": { "platforms": string[], "contentConsumption": string[], "purchasePatterns": string[] },
  "sizeEstimate": { "range": string, "confidence": number }
}]`;

const OPPORTUNITY_SYSTEM = `You are a growth strategist. From the research, identify 2-4 high-leverage opportunities.
Each "type" MUST be one of: "high_pain_low_competition", "pre_saturation_trend", "messaging_gap", "audience_expansion".
Output ONLY a JSON array, no prose, no code fences, matching exactly:
[{ "title": string, "rationale": string, "type": string, "confidence": number }]`;

const personaArraySchema = z.array(audienceSegmentSchema);
/** What we accept from the model for opportunities (sources are attached by us). */
const opportunityModelSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  type: opportunityTypeSchema,
  confidence: z.number().min(0).max(1).optional(),
});
const opportunityArraySchema = z.array(opportunityModelSchema);

export class AiResearchAnalyzer implements ResearchAnalyzer {
  async synthesizePersonas(input: AnalyzeInput): Promise<AudienceSegment[]> {
    if (!isAzureConfigured()) return fallbackPersonas(input.result);

    try {
      const { text } = await generateChat({
        system: PERSONA_SYSTEM,
        prompt: summarizeForPrompt(input.result),
        temperature: 0.4,
        maxOutputTokens: 2000,
        signal: input.signal,
      });
      const parsed = personaArraySchema.safeParse(extractJsonBlock(text));
      if (!parsed.success || parsed.data.length === 0) {
        logger.warn("Persona synthesis output invalid - using seeded fallback", { issues: parsed.success ? "empty" : parsed.error.issues.length });
        return fallbackPersonas(input.result);
      }
      // The model must not fabricate sources; attach real provider citations.
      const sources = pickTopSources(input.result, 6);
      return parsed.data.map((persona) => ({ ...persona, sources: persona.sources.length ? persona.sources : sources }));
    } catch (error) {
      logger.warn("Persona synthesis failed - using seeded fallback", { error: String(error) });
      return fallbackPersonas(input.result);
    }
  }

  async extractPainPoints(input: AnalyzeInput): Promise<PainPoint[]> {
    // Pain points already arrive cited from providers; rank + dedupe deterministically.
    return fallbackPainPoints(input.result);
  }

  async detectBuyingTriggers(input: AnalyzeInput): Promise<BuyingTrigger[]> {
    return fallbackBuyingTriggers(input.result);
  }

  async detectOpportunities(input: AnalyzeInput): Promise<Opportunity[]> {
    if (!isAzureConfigured()) return heuristicOpportunities(input.result);

    try {
      const { text } = await generateChat({
        system: OPPORTUNITY_SYSTEM,
        prompt: summarizeForPrompt(input.result),
        temperature: 0.5,
        maxOutputTokens: 1200,
        signal: input.signal,
      });
      const parsed = opportunityArraySchema.safeParse(extractJsonBlock(text));
      if (!parsed.success || parsed.data.length === 0) {
        logger.warn("Opportunity detection output invalid - using heuristic", { issues: parsed.success ? "empty" : parsed.error.issues.length });
        return heuristicOpportunities(input.result);
      }
      const sources = pickTopSources(input.result, 4);
      return parsed.data.map((op) =>
        opportunitySchema.parse({
          title: op.title,
          rationale: op.rationale,
          type: op.type,
          confidence: op.confidence,
          sources,
        }),
      );
    } catch (error) {
      logger.warn("Opportunity detection failed - using heuristic", { error: String(error) });
      return heuristicOpportunities(input.result);
    }
  }
}

let analyzer: ResearchAnalyzer | null = null;

export function getResearchAnalyzer(): ResearchAnalyzer {
  if (!analyzer) analyzer = new AiResearchAnalyzer();
  return analyzer;
}

/** Hook for tests/seeders to install a deterministic analyzer. */
export function setResearchAnalyzer(custom: ResearchAnalyzer): void {
  analyzer = custom;
}

/** Test hook to reset to the default analyzer. */
export function resetResearchAnalyzer(): void {
  analyzer = null;
}
