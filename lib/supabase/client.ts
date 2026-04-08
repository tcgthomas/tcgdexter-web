import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in browser / client components.
 * Safe to call repeatedly — returns a new client each time but the underlying
 * session is cookie-based, so state is shared across calls.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
