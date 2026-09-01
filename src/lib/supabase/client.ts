import { createBrowserClient } from "@supabase/ssr";

import { getEnv, isSupabaseConfigured } from "@/lib/env";
import { ConfigurationError } from "@/lib/errors";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client (typed to `Database`). Use inside Client Components.
 * Throws `ConfigurationError` when credentials are absent - callers should
 * guard with `isSupabaseConfigured()` and render the "configure credentials"
 * state instead of constructing the client.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new ConfigurationError("supabase", "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  const env = getEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export { isSupabaseConfigured };
