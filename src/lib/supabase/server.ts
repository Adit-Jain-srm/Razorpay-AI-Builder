import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getEnv, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { ConfigurationError } from "@/lib/errors";
import type { Database } from "@/types/database";

// SERVER ONLY. Reads cookies via next/headers and (for the admin client) the
// service role key. Never import from a Client Component.

/**
 * Request-scoped server Supabase client bound to the Next.js cookie store.
 * Create a fresh client per request (do not cache across requests).
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new ConfigurationError("supabase", "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  const env = getEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `set` throws when called from a Server Component render. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client that BYPASSES RLS. Server only. Use for trusted
 * operations: public lead/page-view capture (after validation), seeders, and
 * cron jobs. Never expose to the browser.
 */
export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new ConfigurationError("supabase", "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }
  const env = getEnv();
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
