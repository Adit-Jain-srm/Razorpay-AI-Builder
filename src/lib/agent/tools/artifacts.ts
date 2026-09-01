/**
 * Operator module-tool artifact data shapes.
 *
 * PURE + client-safe: this module declares ONLY the data each module tool emits
 * on its `AgentArtifact`. It has zero runtime exports and imports nothing
 * server-only, so the client artifact renderer (`artifact-view.tsx`) can import
 * these types without pulling Azure / Supabase / module services into the browser
 * bundle. The server tools (`*.tools.ts`) map their rich domain output down to
 * these flat, render-ready shapes.
 *
 * Each `type` string here is the discriminant the `ArtifactView` switch keys on.
 */

import type { SuggestedAction } from "../events";

/* -------------------------------------------------------------------------- */
/* Research                                                                   */
/* -------------------------------------------------------------------------- */

export interface ResearchPersonaCard {
  name: string;
  summary: string;
  ageRange?: string;
  incomeBracket?: string;
  location?: string;
  painPoints: string[];
  platforms: string[];
  sizeRange?: string;
}

export interface ResearchSourceLink {
  provider: string;
  title?: string;
  url?: string;
}

export interface ResearchCompetitorAngle {
  advertiser?: string;
  platform: string;
  hooks: string[];
  copy?: string;
}

export interface ResearchOpportunityCard {
  title: string;
  type: string;
  rationale: string;
}

/** `research_audience` -> a citation-rich audience report. */
export interface ResearchReportArtifactData {
  query: string;
  personas: ResearchPersonaCard[];
  painPoints: { summary: string; quote?: string }[];
  competitorAngles: ResearchCompetitorAngle[];
  opportunities: ResearchOpportunityCard[];
  sources: ResearchSourceLink[];
  sourceCount: number;
  providerRuns: { provider: string; status: string; itemCount: number }[];
}

/** `get_personas` -> personas from a saved research project. */
export interface PersonasArtifactData {
  projectId?: string;
  projectName?: string;
  personas: ResearchPersonaCard[];
}

/* -------------------------------------------------------------------------- */
/* Campaign                                                                   */
/* -------------------------------------------------------------------------- */

/** `create_campaign` / `get_campaign` -> a campaign brief card. */
export interface CampaignArtifactData {
  id: string;
  name: string;
  status: string;
  objective: string;
  product?: string;
  offer?: string;
  audience?: string;
  valueProps: string[];
  platforms: string[];
  personaCount: number;
  budgetTotal?: number;
  currency: string;
  source?: string;
}

/** `list_campaigns` -> a compact campaign roster. */
export interface CampaignListArtifactData {
  total: number;
  campaigns: { id: string; name: string; status: string; platforms: string[]; updatedAt: string }[];
}

/** `recommend_platforms` -> ranked platform fit. */
export interface PlatformRecommendationsArtifactData {
  recommendations: { platform: string; fit: number; rationale: string }[];
  source?: string;
}

/** `suggest_budget` -> a normalized budget split. */
export interface BudgetPlanArtifactData {
  total?: number;
  currency: string;
  allocations: { platform: string; percent: number; amount: number | null; rationale: string }[];
  source: string;
}

/* -------------------------------------------------------------------------- */
/* Creative                                                                   */
/* -------------------------------------------------------------------------- */

export interface CreativeVariantCard {
  id?: string;
  platform: string;
  format: string;
  headline: string;
  body: string;
  hookType: string;
  hookConfidence: number;
  score: number;
  grade: string;
  angle?: string;
  flags: string[];
}

/** `generate_creatives` / `regenerate_creative` -> hook-analyzed variants. */
export interface CreativeSetArtifactData {
  campaignId: string;
  platform: string;
  /** Generation source when known (`regenerate_creative` omits it). */
  source?: "ai" | "seeded";
  /** True when this set is a single in-place regeneration. */
  regenerated?: boolean;
  variants: CreativeVariantCard[];
}

/** `score_creative` -> a direct-response scorecard. */
export interface CreativeScoreArtifactData {
  platform: string;
  headline: string;
  hookType: string;
  hookConfidence: number;
  total: number;
  grade: string;
  breakdown: { clarity: number; specificity: number; ctaStrength: number; hookStrength: number };
  notes: string[];
}

/* -------------------------------------------------------------------------- */
/* Landing pages                                                              */
/* -------------------------------------------------------------------------- */

/** `build_landing_page` / `deploy_landing_page` -> a page preview + live link. */
export interface LandingPageArtifactData {
  id: string;
  slug: string;
  url: string;
  template: string;
  status: string;
  deployed: boolean;
  headline: string;
  sections: { type: string; label: string }[];
  source?: "ai" | "seeded";
  stats?: { views: number; leads: number; cvr: number };
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export interface AnalyticsSummaryFigures {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

/** `get_performance_summary` -> roll-up + per-platform breakdown. */
export interface AnalyticsSummaryArtifactData {
  campaignId: string;
  rangeDays: number;
  summary: AnalyticsSummaryFigures;
  platforms: { platform: string; spend: number; roas: number; cpa: number; spendShare: number }[];
}

export interface AnomalyCard {
  metric: string;
  platform: string;
  severity: string;
  description: string;
}

/** `detect_anomalies` -> flagged deviations. */
export interface AnomaliesArtifactData {
  campaignId: string;
  total: number;
  anomalies: AnomalyCard[];
}

export interface RecommendationCard {
  id: string;
  type: string;
  priority: string;
  title: string;
  rationale: string;
  metricLabel?: string;
  creativeId?: string | null;
  platform?: string | null;
}

/** `get_recommendations` -> the improvement-loop action list. */
export interface RecommendationsArtifactData {
  campaignId: string;
  total: number;
  recommendations: RecommendationCard[];
}

/** `daily_brief` -> a natural-language performance brief. */
export interface DailyBriefArtifactData {
  campaignId: string;
  campaignName: string;
  rangeDays: number;
  content: string;
  source: "ai" | "templated";
  confidence: number;
}

/** `proactive_briefing` -> brief + anomalies + recommendations + next actions. */
export interface ProactiveBriefingArtifactData {
  campaignId: string;
  campaignName: string;
  brief: DailyBriefArtifactData;
  anomalies: AnomalyCard[];
  recommendations: RecommendationCard[];
  nextActions: SuggestedAction[];
}
