import { DEMO_CAMPAIGN_ID } from "@/lib/seed/constants";
import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { AgentArtifact, AgentToolResult, ToolExecutionContext } from "../types";

/**
 * Shared helpers + constants for the Operator's module tools.
 *
 * Client-safe (imports only the logger + the error formatter), so it can be
 * pulled into any tool module without dragging server clients along. The actual
 * module services are imported by the individual `*.tools.ts` files, which are
 * server-only and registered from the route handler.
 */

/** Tool grouping used by the UI, the command palette, and `list_capabilities`. */
export const MODULE_TOOL_CATEGORY = {
  research: "research",
  campaign: "campaign",
  creative: "creative",
  landing: "landing",
  analytics: "analytics",
} as const;

export type ModuleToolCategory = (typeof MODULE_TOOL_CATEGORY)[keyof typeof MODULE_TOOL_CATEGORY];

/**
 * Demo campaign identity the Operator falls back to when a goal is not scoped
 * to a specific campaign. Now unified under the canonical demo seed.
 */
export const OPERATOR_DEMO_CAMPAIGN_ID = DEMO_CAMPAIGN_ID;
export const OPERATOR_DEMO_CONTENT_CAMPAIGN_ID = DEMO_CAMPAIGN_ID;

/**
 * Resolves the campaign a tool should operate on: an explicit argument wins,
 * then the conversation's scoped campaign, then a documented demo default. This
 * keeps one-off prompts ("show me performance") working while still honoring an
 * id the model threaded through the golden path.
 */
export function resolveCampaignId(
  explicit: string | undefined,
  ctx: ToolExecutionContext,
  fallback: string,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  if (ctx.campaignId?.trim()) return ctx.campaignId.trim();
  return fallback;
}

/** Builds a successful tool result carrying a typed artifact. */
export function ok<T>(data: T, artifact: AgentArtifact): AgentToolResult<T> {
  return { ok: true, data, artifact };
}

/**
 * Runs a tool body fail-safe: any thrown/rejected error is logged and converted
 * into a structured `{ ok: false, error }` the agent can recover from, so a tool
 * failure is never an unhandled exception that breaks the run. This is the single
 * try/catch boundary every module tool wraps its work in.
 */
export async function runToolSafely<T>(
  toolName: string,
  fn: () => Promise<AgentToolResult<T>>,
): Promise<AgentToolResult<T>> {
  try {
    return await fn();
  } catch (error) {
    const message = toErrorMessage(error);
    logger.warn(`operator.tool ${toolName} failed`, { error: message });
    return { ok: false, error: message };
  }
}
