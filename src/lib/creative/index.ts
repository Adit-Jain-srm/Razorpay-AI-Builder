/**
 * Client-safe Creative Studio surface. Only PURE modules are re-exported here so
 * UI components can import types, platform specs, limit enforcement, hook/score
 * helpers, and export formatters without pulling Azure/Supabase into the client
 * bundle. Server orchestration (copy generation, studio, persistence) is imported
 * directly from its module by server code / actions.
 */

export * from "./types";
export * from "./platforms";
export * from "./limits";
export * from "./hooks";
export * from "./scoring";
export * from "./export";
export * from "./assemble";
export {
  toneProfileSchema,
  deriveToneProfile,
  summarizeToneForPrompt,
  type ToneProfile,
} from "./brand-voice";
export {
  aspectRatioToImageSize,
  aspectRatioPixels,
  buildPlaceholderImage,
  buildImagePrompt,
  isDataUrl,
} from "./visuals";
