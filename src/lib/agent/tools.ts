import { z } from "zod";

import { toErrorMessage } from "@/lib/errors";

import { agentToolRegistry } from "./registry";
import { defineTool, type AgentTool, type ToolRegistry } from "./types";

/**
 * Built-in Operator tools.
 *
 * These prove the plan -> execute -> observe loop end to end *today* without any
 * external dependency (no Azure, no Bright Data, no Supabase needed to run them).
 * Real module tools (research, creative, landing, analytics, campaign) are added
 * in the `agent-tools` phase by registering more tools on the same registry - the
 * runtime never changes.
 *
 * Every `execute` is fail-safe: it catches its own errors and returns a structured
 * `{ ok: false, error }` so a tool failure is a recoverable event the agent reads,
 * never a thrown exception that breaks the run.
 */

export const BUILTIN_TOOL_CATEGORY = {
  navigation: "navigation",
  platform: "platform",
} as const;

/** App routes the Operator may navigate to. Mirrors `src/lib/nav.ts` (kept inline to keep this module dependency-light and testable). */
const KNOWN_ROUTES: { href: string; label: string }[] = [
  { href: "/", label: "Command Center" },
  { href: "/operator", label: "Operator" },
  { href: "/research", label: "Research" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/creatives", label: "Creatives" },
  { href: "/landing-pages", label: "Landing Pages" },
  { href: "/analytics", label: "Analytics" },
];

export interface NavigationArtifactData {
  href: string;
  label: string;
}

export interface CapabilitiesArtifactData {
  total: number;
  categories: { name: string; tools: { name: string; description: string }[] }[];
}

export interface ContextSummaryArtifactData {
  userId: string;
  conversationId?: string;
  campaignId?: string;
  focus?: string;
  note: string;
}

/**
 * Creates the built-in tools bound to a specific registry (so `list_capabilities`
 * reports the tools of that registry). Use `registerBuiltinTools` for the shared
 * singleton; this factory exists mainly for isolated testing.
 */
export function createBuiltinTools(registry: ToolRegistry): AgentTool[] {
  const navigate = defineTool({
    name: "navigate",
    description: "Open one of the platform's screens (Command Center, Research, Campaigns, Creatives, Landing Pages, Analytics, Operator). Returns a navigation artifact the UI can act on.",
    category: BUILTIN_TOOL_CATEGORY.navigation,
    parameters: z.object({
      route: z.string().min(1).describe("Target route, e.g. /research or /campaigns"),
    }),
    execute: async ({ route }) => {
      try {
        const match = KNOWN_ROUTES.find((r) => r.href === normalizeRoute(route));
        if (!match) {
          return {
            ok: false,
            error: `Unknown route "${route}". Valid routes: ${KNOWN_ROUTES.map((r) => r.href).join(", ")}.`,
          };
        }
        const data: NavigationArtifactData = { href: match.href, label: match.label };
        return {
          ok: true,
          data,
          artifact: { type: "navigation", title: `Open ${match.label}`, data },
        };
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    },
  });

  const listCapabilities = defineTool({
    name: "list_capabilities",
    description: "List every tool the Operator can currently use, grouped by category. Use this to understand what is possible right now.",
    category: BUILTIN_TOOL_CATEGORY.platform,
    parameters: z.object({}),
    execute: async () => {
      try {
        const grouped = new Map<string, { name: string; description: string }[]>();
        for (const tool of registry.list()) {
          const key = tool.category ?? "general";
          const bucket = grouped.get(key) ?? [];
          bucket.push({ name: tool.name, description: tool.description });
          grouped.set(key, bucket);
        }
        const categories = [...grouped.entries()].map(([name, tools]) => ({ name, tools }));
        const total = categories.reduce((sum, category) => sum + category.tools.length, 0);
        const data: CapabilitiesArtifactData = { total, categories };
        return {
          ok: true,
          data,
          artifact: { type: "capabilities", title: "Operator capabilities", data },
        };
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    },
  });

  const summarizeContext = defineTool({
    name: "summarize_context",
    description: "Summarize the Operator's working context (active conversation and campaign) so the plan stays grounded. Optionally focus on a specific aspect.",
    category: BUILTIN_TOOL_CATEGORY.platform,
    parameters: z.object({
      focus: z.string().max(280).optional().describe("Optional aspect to focus the summary on"),
    }),
    execute: async ({ focus }, ctx) => {
      try {
        const parts = [
          ctx.campaignId ? `scoped to campaign ${ctx.campaignId}` : "not scoped to a campaign yet",
          ctx.conversationId ? `in conversation ${ctx.conversationId}` : "in a fresh conversation",
        ];
        const note = `Operating ${parts.join(", ")}.${focus ? ` Focus: ${focus}.` : ""}`;
        const data: ContextSummaryArtifactData = {
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          campaignId: ctx.campaignId,
          focus,
          note,
        };
        return {
          ok: true,
          data,
          artifact: { type: "context-summary", title: "Working context", data },
        };
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    },
  });

  return [navigate, listCapabilities, summarizeContext];
}

/**
 * Registers the built-in tools on the shared singleton (or a provided registry).
 * Idempotent: skips tools already registered so repeated calls (e.g. per request
 * on a warm serverless instance) are safe.
 */
export function registerBuiltinTools(registry: ToolRegistry = agentToolRegistry): void {
  for (const tool of createBuiltinTools(registry)) {
    if (!registry.has(tool.name)) registry.register(tool);
  }
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "");
}
