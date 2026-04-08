import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Called from the root middleware.ts on every request.
 * Refreshes the Supabase session cookie if it's close to expiring,
 * so signed-in users stay signed in without needing to re-auth.
 *
 * This does NOT gate any routes — it only keeps sessions fresh.
 * Route protection happens in individual server components via redirect().
 *
 * Defensive: wrapped in try/catch so a Supabase/env misconfiguration can
 * never crash the entire site with MIDDLEWARE_INVOCATION_FAILED. If auth
 * refresh fails, we pass through as if the user were anonymous and log
 * the error to the edge logs.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't present (e.g. during a build that predates them),
  // just pass through. The app will behave as if no user is signed in.
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[supabase/middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY; passing through."
    );
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: This call refreshes the session if needed.
    // Must run on every request to keep the auth cookie fresh.
    await supabase.auth.getUser();
  } catch (err) {
    console.error("[supabase/middleware] Auth refresh failed:", err);
    // Pass through — let the page handle the unauthenticated state.
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
