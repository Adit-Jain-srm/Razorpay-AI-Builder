import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

import { formatChangePct, formatCurrency, formatMultiplier, formatPercent, platformLabel } from "./format";
import type {
  AnomalyFinding,
  CreativePerformance,
  DailyBriefResult,
  MetricSummary,
  PlatformSummary,
  Recommendation,
  SummaryDeltas,
} from "./types";

/**
 * AI daily brief - a natural-language summary of trends, anomalies, and
 * opportunities the Operator can surface proactively. Mirrors the campaign
 * assistant's contract: Azure GPT-4o when configured, otherwise a DETERMINISTIC
 * templated brief computed from the same stats so it ALWAYS renders well with
 * zero credentials. Every external call is guarded + wrapped in try/catch.
 *
 * SERVER ONLY (imports the Azure client). The pure `templatedBrief` is exported
 * for the seeder + tests and never touches the network.
 */

export interface DailyBriefInput {
  campaignName: string;
  /** Days of history the brief summarizes. */
  rangeDays: number;
  summary: MetricSummary;
  /** Period-over-period deltas (most recent week vs prior week by default). */
  deltas: SummaryDeltas;
  platforms: readonly PlatformSummary[];
  topCreatives: readonly CreativePerformance[];
  anomalies: readonly AnomalyFinding[];
  recommendations: readonly Recommendation[];
  signal?: AbortSignal;
}

/* -------------------------------------------------------------------------- */
/* Templated (credential-free) brief                                          */
/* -------------------------------------------------------------------------- */

function headline(input: DailyBriefInput): string {
  const { summary, rangeDays, campaignName } = input;
  return `Over the last ${rangeDays} days, ${campaignName} spent ${formatCurrency(summary.spend)} to drive ${summary.conversions.toLocaleString("en-US")} conversions at a ${formatCurrency(summary.cpa)} blended CPA and ${formatMultiplier(summary.roas)} ROAS.`;
}

function trendSentence(deltas: SummaryDeltas): string | null {
  const parts: string[] = [];
  if (deltas.cpa.changePct !== null && Math.abs(deltas.cpa.changePct) >= 3) {
    const better = deltas.cpa.changePct < 0;
    parts.push(`CPA is ${better ? "down" : "up"} ${formatChangePct(deltas.cpa.changePct)} week over week`);
  }
  if (deltas.conversions.changePct !== null && Math.abs(deltas.conversions.changePct) >= 5) {
    parts.push(`conversions ${deltas.conversions.changePct > 0 ? "rose" : "fell"} ${formatChangePct(deltas.conversions.changePct)}`);
  }
  if (deltas.roas.changePct !== null && Math.abs(deltas.roas.changePct) >= 5) {
    parts.push(`ROAS ${deltas.roas.changePct > 0 ? "improved" : "softened"} ${formatChangePct(deltas.roas.changePct)}`);
  }
  if (parts.length === 0) return null;
  const sentence = parts.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function platformSentence(platforms: readonly PlatformSummary[]): string | null {
  const withRoas = platforms.filter((p) => p.spend > 0);
  if (withRoas.length === 0) return null;
  const ranked = [...withRoas].sort((a, b) => b.roas - a.roas);
  const best = ranked[0];
  if (ranked.length === 1) {
    return `${platformLabel(best.platform)} is carrying delivery at ${formatMultiplier(best.roas)} ROAS (${formatPercent(best.spendShare)} of spend).`;
  }
  const worst = ranked[ranked.length - 1];
  return `${platformLabel(best.platform)} leads on efficiency at ${formatMultiplier(best.roas)} ROAS while ${platformLabel(worst.platform)} lags at ${formatMultiplier(worst.roas)}.`;
}

function anomalySentence(anomalies: readonly AnomalyFinding[]): string | null {
  if (anomalies.length === 0) return "No anomalies detected; delivery is within normal variance.";
  const top = anomalies[0];
  const more = anomalies.length - 1;
  const tail = more > 0 ? ` (+${more} more flagged)` : "";
  return `Anomaly watch: ${top.description}${tail}`;
}

function recommendationSentence(recommendations: readonly Recommendation[]): string | null {
  if (recommendations.length === 0) return null;
  const top = recommendations[0];
  return `Recommended next: ${top.title}. ${top.rationale}`;
}

/**
 * Deterministic, well-formed brief from computed stats. Pure (no network), so it
 * is the credential-free default and is unit-tested directly.
 */
export function templatedBrief(input: DailyBriefInput): string {
  const lines = [
    headline(input),
    trendSentence(input.deltas),
    platformSentence(input.platforms),
    anomalySentence(input.anomalies),
    recommendationSentence(input.recommendations),
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* AI brief                                                                    */
/* -------------------------------------------------------------------------- */

const BRIEF_SYSTEM = `You are a senior performance-marketing analyst writing a campaign's daily brief for a media buyer.
Write 4-6 crisp sentences in plain English. Lead with the headline result, then the most important trend, the standout platform, any anomaly worth acting on, and a single clear recommended next action.
Be specific with the numbers you are given; do not invent data. No preamble, no bullet points, no markdown headings - just the brief.`;

function statsPrompt(input: DailyBriefInput): string {
  const { summary, deltas } = input;
  const lines = [
    `CAMPAIGN: ${input.campaignName}`,
    `WINDOW: last ${input.rangeDays} days`,
    `TOTALS: spend ${formatCurrency(summary.spend)}, ${summary.conversions} conversions, CPA ${formatCurrency(summary.cpa)}, CTR ${formatPercent(summary.ctr)}, CVR ${formatPercent(summary.cvr)}, ROAS ${formatMultiplier(summary.roas)}`,
    `WEEK-OVER-WEEK: CPA ${formatChangePct(deltas.cpa.changePct)}, conversions ${formatChangePct(deltas.conversions.changePct)}, ROAS ${formatChangePct(deltas.roas.changePct)}`,
    `PLATFORMS: ${input.platforms.map((p) => `${platformLabel(p.platform)} ${formatMultiplier(p.roas)} ROAS / ${formatCurrency(p.cpa)} CPA`).join("; ")}`,
  ];
  if (input.topCreatives.length > 0) {
    lines.push(`TOP CREATIVES: ${input.topCreatives.slice(0, 3).map((c) => `${c.label} (${formatCurrency(c.cpa)} CPA)`).join("; ")}`);
  }
  if (input.anomalies.length > 0) {
    lines.push(`ANOMALIES: ${input.anomalies.slice(0, 3).map((a) => a.description).join(" ")}`);
  }
  if (input.recommendations.length > 0) {
    lines.push(`CANDIDATE ACTIONS: ${input.recommendations.slice(0, 3).map((r) => `${r.title} (${r.rationale})`).join("; ")}`);
  }
  return lines.join("\n");
}

/**
 * Generate the daily brief: Azure GPT-4o when configured, otherwise the templated
 * fallback. Never throws - any failure degrades to the templated brief so the
 * panel always renders.
 */
export async function generateDailyBrief(input: DailyBriefInput): Promise<DailyBriefResult> {
  const generatedAt = new Date().toISOString();
  if (!isAzureConfigured()) {
    return { content: templatedBrief(input), source: "templated", confidence: 0.55, generatedAt };
  }
  try {
    const { text } = await generateChat({
      system: BRIEF_SYSTEM,
      prompt: statsPrompt(input),
      temperature: 0.4,
      maxOutputTokens: 600,
      signal: input.signal,
    });
    const content = text.trim();
    if (!content) return { content: templatedBrief(input), source: "templated", confidence: 0.55, generatedAt };
    return { content, source: "ai", confidence: 0.82, generatedAt };
  } catch (error) {
    logger.warn("Daily brief generation failed - using templated fallback", { error: String(error) });
    return { content: templatedBrief(input), source: "templated", confidence: 0.55, generatedAt };
  }
}
