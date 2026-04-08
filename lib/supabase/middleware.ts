import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Called from the root middleware.ts on every request.
 * Refreshes the Supabase session cookie if it's close to expiring,
 * so signed-in users stay signed in without needing to re-auth.
 *
 * This does NOT gate any routes — it only keeps sessions fresh.
 * Route protection happens in individual server components via redirect().
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: This call refreshes the session if needed.
  // Must run on every request to keep the auth cookie fresh.
  await supabase.auth.getUser();

  return supabaseResponse;
}
