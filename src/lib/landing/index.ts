/**
 * Client-safe Landing Page Engine surface. Only PURE modules are re-exported so
 * the editor + public renderer import types, theme resolution, templates, A/B
 * assignment, slug, and UTM helpers without pulling Azure/Supabase into the
 * client bundle. SERVER orchestration (generation, persistence, studio) is
 * imported directly from its module by server code / actions / routes.
 */

export * from "./types";
export * from "./theme";
export * from "./slug";
export * from "./utm";
export * from "./ab";
export {
  TEMPLATE_LIBRARY,
  TEMPLATE_ORDER,
  buildLandingDocument,
  detectFinance,
  resetSectionSequence,
  FINANCE_DISCLAIMERS,
  type LandingContext,
  type TemplateInfo,
  type BuildDocumentOptions,
} from "./templates";
export { buildLandingSystemPrompt, buildLandingUserPrompt } from "./prompts";
