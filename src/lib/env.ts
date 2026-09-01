import { z } from "zod";

/**
 * Lazy, non-crashing environment loader.
 *
 * The platform must boot with placeholder (or missing) credentials so that
 * feature teams and demo reviewers can run the app and see a friendly
 * "configure credentials" state instead of a hard crash. Therefore every
 * variable falls back to a safe default and validation never throws at import
 * time. Call sites that genuinely need a credential (the Supabase / Azure /
 * Bright Data clients) check the `is*Configured()` predicates and raise a typed
 * `ConfigurationError` only at the moment the credential is actually used.
 */

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),

  // Azure AI Foundry (OpenAI-compatible v1 surface - services.ai.azure.com).
  // Chat + image share one key. See Docs/azure-models.md.
  AZURE_OPENAI_ENDPOINT: z.string().default(""),
  AZURE_OPENAI_API_KEY: z.string().default(""),
  // OpenAI-compatible v1 base URL (`.../openai/v1`). When blank it is derived
  // from AZURE_OPENAI_ENDPOINT at call time.
  AZURE_OPENAI_BASE_URL: z.string().default(""),
  // Chat/reasoning deployment. The legacy *_GPT4O_DEPLOYMENT key is kept for
  // backward compatibility; *_CHAT_DEPLOYMENT is the v1-aligned name.
  AZURE_OPENAI_GPT4O_DEPLOYMENT: z.string().min(1).default("gpt-5.3-chat"),
  AZURE_OPENAI_CHAT_DEPLOYMENT: z.string().default(""),
  AZURE_OPENAI_IMAGE_DEPLOYMENT: z.string().min(1).default("MAI-Image-2.5"),
  // Full image generations URL. When blank it is derived from the base URL.
  AZURE_OPENAI_IMAGE_ENDPOINT: z.string().default(""),
  AZURE_OPENAI_API_VERSION: z.string().min(1).default("preview"),
  // Project endpoint (responses API). Optional; not required by the v1 path.
  AZURE_AI_PROJECT_ENDPOINT: z.string().default(""),

  // Bright Data MCP
  BRIGHTDATA_API_TOKEN: z.string().default(""),
  // Bright Data zones (optional). Web Unlocker zone powers scraping; the SERP
  // zone (when set) powers search - otherwise search reuses the unlocker zone.
  BRIGHTDATA_WEB_UNLOCKER_ZONE: z.string().default("mcp_unlocker"),
  BRIGHTDATA_SERP_ZONE: z.string().default(""),
  // Scraping Browser (Puppeteer/Playwright) WSS endpoint. Optional - when set it
  // enables interactive / JS-heavy scraping via a remote Bright Data browser.
  BRIGHTDATA_BROWSER_WS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Returns the validated environment. References each variable literally so that
 * Next.js can statically inline the `NEXT_PUBLIC_*` values into the client
 * bundle. Never throws: on a validation failure it falls back to schema
 * defaults so the app still boots in a degraded, clearly-signposted state.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_BASE_URL: process.env.AZURE_OPENAI_BASE_URL,
    AZURE_OPENAI_GPT4O_DEPLOYMENT: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT,
    AZURE_OPENAI_CHAT_DEPLOYMENT: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
    AZURE_OPENAI_IMAGE_DEPLOYMENT: process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT,
    AZURE_OPENAI_IMAGE_ENDPOINT: process.env.AZURE_OPENAI_IMAGE_ENDPOINT,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
    AZURE_AI_PROJECT_ENDPOINT: process.env.AZURE_AI_PROJECT_ENDPOINT,
    BRIGHTDATA_API_TOKEN: process.env.BRIGHTDATA_API_TOKEN,
    BRIGHTDATA_WEB_UNLOCKER_ZONE: process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE,
    BRIGHTDATA_SERP_ZONE: process.env.BRIGHTDATA_SERP_ZONE,
    BRIGHTDATA_BROWSER_WS: process.env.BRIGHTDATA_BROWSER_WS,
  });

  cached = parsed.success ? parsed.data : envSchema.parse({});
  return cached;
}

/** Treats blank values and obvious placeholders as "not configured". */
function isMissing(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  if (v === "") return true;
  return (
    v.startsWith("your-") ||
    v.startsWith("your_") ||
    v.startsWith("placeholder") ||
    v.startsWith("replace-me") ||
    v.startsWith("replace_me") ||
    v === "changeme"
  );
}

export function isSupabaseConfigured(): boolean {
  const e = getEnv();
  return (
    !isMissing(e.NEXT_PUBLIC_SUPABASE_URL) &&
    !isMissing(e.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Service-role access (server only) additionally requires the secret key. */
export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && !isMissing(getEnv().SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Azure AI Foundry (v1 surface) is usable once we have a key plus a base URL to
 * reach it - either the explicit `AZURE_OPENAI_BASE_URL` or the resource
 * `AZURE_OPENAI_ENDPOINT` we derive `.../openai/v1` from. The chat deployment
 * always resolves (it has a non-empty default), so it is not gating here.
 */
export function isAzureConfigured(): boolean {
  const e = getEnv();
  if (isMissing(e.AZURE_OPENAI_API_KEY)) return false;
  return !isMissing(e.AZURE_OPENAI_BASE_URL) || !isMissing(e.AZURE_OPENAI_ENDPOINT);
}

export function isBrightDataConfigured(): boolean {
  return !isMissing(getEnv().BRIGHTDATA_API_TOKEN);
}

/** Snapshot of which integrations are wired up - handy for "setup" UI states. */
export interface ServiceConfigStatus {
  supabase: boolean;
  supabaseAdmin: boolean;
  azure: boolean;
  brightData: boolean;
}

export function getServiceConfigStatus(): ServiceConfigStatus {
  return {
    supabase: isSupabaseConfigured(),
    supabaseAdmin: isSupabaseAdminConfigured(),
    azure: isAzureConfigured(),
    brightData: isBrightDataConfigured(),
  };
}
