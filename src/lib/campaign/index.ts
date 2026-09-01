/**
 * Public, client-safe surface of the campaign domain. Only the PURE modules
 * (schemas, decoders, templates) are re-exported here so a client component can
 * `import { ... } from "@/lib/campaign"` without dragging in server-only code.
 *
 * Server-only modules are imported by their explicit path instead:
 * - `@/lib/campaign/store`     - persistence (Supabase + in-memory)
 * - `@/lib/campaign/assistant` - AI brief assistant
 * - `@/lib/campaign/personas`  - research persona import (read-only research svc)
 */
export * from "./brief";
export * from "./templates";
