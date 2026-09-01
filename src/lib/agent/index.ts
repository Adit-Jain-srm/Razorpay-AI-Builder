export * from "./types";
export { agentToolRegistry } from "./registry";
export {
  buildOperatorSystemPrompt,
  OPERATOR_SYSTEM_PROMPT,
  OPERATOR_IDENTITY,
  OPERATOR_PRINCIPLES,
  OPERATOR_WORKFLOW,
  type OperatorPromptContext,
} from "./prompts";

// Streaming protocol (import-safe on client + server).
export {
  type OperatorEvent,
  type OperatorEventType,
  type OperatorMode,
  type NoticeLevel,
  type SuggestedAction,
  encodeEvent,
  decodeEvents,
} from "./events";

// Planning helpers.
export {
  parsePlan,
  fallbackPlan,
  pickPendingStepForTool,
  summarizePlan,
  buildSuggestedActions,
  buildPlanningPrompt,
  deriveConversationTitle,
  PLANNER_SYSTEM_PROMPT,
} from "./plan";

// Built-in tools + registration.
export {
  createBuiltinTools,
  registerBuiltinTools,
  BUILTIN_TOOL_CATEGORY,
  type NavigationArtifactData,
  type CapabilitiesArtifactData,
  type ContextSummaryArtifactData,
} from "./tools";

// NOTE: the runtime (`./runtime`) is intentionally NOT re-exported here. It pulls
// in server-only clients (Azure, Supabase) and must be imported directly from
// the route handler so it never lands in a client bundle.
