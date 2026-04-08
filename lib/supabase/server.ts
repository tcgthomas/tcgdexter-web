import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in server components, route handlers, and server actions.
 * Reads/writes the session cookie via Next.js's cookies() API.
 *
 * Note: this function is async because Next 14's cookies() is sync but Next 15's
 * is async. We write it async so the call site is forward-compatible.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method may be called from a Server Component,
            // which cannot set cookies. Safe to ignore if middleware is
            // refreshing sessions on every request (which it is).
          }
        },
      },
    }
  );
}
