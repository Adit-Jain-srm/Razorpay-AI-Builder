import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { getEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

export interface SessionResult {
  response: NextResponse;
  user: User | null;
}

/**
 * Refreshes the Supabase auth session on every request and returns the verified
 * user. Must run in middleware so token refreshes are written back to cookies.
 * When Supabase is not configured it no-ops (returns a pass-through response and
 * a null user) so the app still boots in degraded mode.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return { response, user: null };
  }

  const env = getEnv();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Auth responses must not be cached by CDNs/proxies.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // IMPORTANT: getUser() contacts the Auth server and verifies the token. Do
  // not insert logic between client creation and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
