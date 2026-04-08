import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — uses the service role key, bypasses RLS.
 *
 * ONLY use this from server-side code (route handlers, server actions,
 * server components) for operations that need to bypass row-level security.
 * Never import this file from a client component or anything under "use client".
 *
 * Current uses:
 *   - writing to analysis_submissions (internal analytics, no user-level RLS)
 *
 * The service role key is read from SUPABASE_SERVICE_ROLE_KEY, a non-public
 * env var that only exists on the server. If it's missing, createAdminClient
 * throws so we fail loudly rather than silently falling back to anon.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
