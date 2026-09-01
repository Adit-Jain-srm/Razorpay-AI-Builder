import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The env loader must never throw on missing/placeholder credentials so the app
 * boots into a "configure credentials" state. Each test re-imports the module
 * after `vi.resetModules()` so the module-level cache is rebuilt against the
 * stubbed `process.env` for that case.
 */
describe("env loader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never throws and exposes typed defaults when nothing is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");
    vi.stubEnv("BRIGHTDATA_API_TOKEN", "");

    const env = await import("./env");

    expect(() => env.getEnv()).not.toThrow();
    const value = env.getEnv();
    // Deployment + version always fall back to a non-empty default.
    expect(value.AZURE_OPENAI_GPT4O_DEPLOYMENT.length).toBeGreaterThan(0);
    expect(value.AZURE_OPENAI_API_VERSION.length).toBeGreaterThan(0);
  });

  it("reports every integration as not configured when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");
    vi.stubEnv("BRIGHTDATA_API_TOKEN", "");

    const env = await import("./env");

    expect(env.getServiceConfigStatus()).toEqual({
      supabase: false,
      supabaseAdmin: false,
      azure: false,
      brightData: false,
    });
  });

  it("treats placeholder values as not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "your-project-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "PLACEHOLDER");

    const env = await import("./env");

    expect(env.isSupabaseConfigured()).toBe(false);
  });

  it("treats real-looking values as configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "ey.real.anon.key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "ey.real.service.key");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://my-resource.openai.azure.com");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "real-azure-key");
    vi.stubEnv("BRIGHTDATA_API_TOKEN", "bd_live_token");

    const env = await import("./env");

    expect(env.isSupabaseConfigured()).toBe(true);
    expect(env.isSupabaseAdminConfigured()).toBe(true);
    expect(env.isAzureConfigured()).toBe(true);
    expect(env.isBrightDataConfigured()).toBe(true);
  });
});

describe("isAzureConfigured (Foundry v1 surface)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is configured from the v1 base URL + key alone (no resource endpoint)", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("AZURE_OPENAI_BASE_URL", "https://res.services.ai.azure.com/openai/v1");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "real-azure-key");

    const env = await import("./env");
    expect(env.isAzureConfigured()).toBe(true);
  });

  it("is configured from the resource endpoint + key when no base URL is set", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://res.services.ai.azure.com");
    vi.stubEnv("AZURE_OPENAI_BASE_URL", "");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "real-azure-key");

    const env = await import("./env");
    expect(env.isAzureConfigured()).toBe(true);
  });

  it("is NOT configured when the key is missing even with a base URL", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("AZURE_OPENAI_BASE_URL", "https://res.services.ai.azure.com/openai/v1");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");

    const env = await import("./env");
    expect(env.isAzureConfigured()).toBe(false);
  });

  it("is NOT configured when the key is present but no base URL or endpoint", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("AZURE_OPENAI_BASE_URL", "");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "real-azure-key");

    const env = await import("./env");
    expect(env.isAzureConfigured()).toBe(false);
  });
});
