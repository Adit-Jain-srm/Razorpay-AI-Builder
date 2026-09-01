import { agentToolRegistry } from "../registry";
import type { AgentTool, ToolRegistry } from "../types";

import { createAnalyticsTools } from "./analytics.tools";
import { createCampaignTools } from "./campaign.tools";
import { createCreativeTools } from "./creative.tools";
import { createLandingTools } from "./landing.tools";
import { createResearchTools } from "./research.tools";

/**
 * Module-tool barrel + registration.
 *
 * SERVER ONLY: pulls in the module services (research, campaign, creative,
 * landing, analytics) and the Azure/Supabase clients behind them. Import this
 * from the route handler (or other server code) - never from a Client Component.
 * The client renders artifacts from the pure types in `./artifacts`.
 *
 * NOTE on resolution: a sibling file `../tools.ts` (built-ins) coexists with this
 * `tools/` directory. The bare specifier `@/lib/agent/tools` resolves to the FILE
 * (built-ins); this barrel is reached via the explicit `@/lib/agent/tools/index`
 * path, so the two never collide.
 */

export { MODULE_TOOL_CATEGORY, OPERATOR_DEMO_CAMPAIGN_ID, OPERATOR_DEMO_CONTENT_CAMPAIGN_ID } from "./shared";
export type { ModuleToolCategory } from "./shared";

/** Instantiates every module tool (research, campaign, creative, landing, analytics). */
export function createModuleTools(): AgentTool[] {
  return [
    ...createResearchTools(),
    ...createCampaignTools(),
    ...createCreativeTools(),
    ...createLandingTools(),
    ...createAnalyticsTools(),
  ];
}

/**
 * Registers every module tool on the shared singleton (or a provided registry).
 * Idempotent: skips tools already registered so repeated calls (e.g. per request
 * on a warm serverless instance) are safe - mirroring `registerBuiltinTools`.
 */
export function registerModuleTools(registry: ToolRegistry = agentToolRegistry): void {
  for (const tool of createModuleTools()) {
    if (!registry.has(tool.name)) registry.register(tool);
  }
}
