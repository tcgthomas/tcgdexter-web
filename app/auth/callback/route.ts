import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth callback — handles the redirect from the magic link email.
 *
 * Supabase sends the user to this URL after they click the magic link in
 * their email. The URL carries a `code` query param which we exchange for
 * a session cookie, then redirect the user to their destination.
 *
 * Flow:
 *   1. User submits email on /sign-in → Supabase emails magic link
 *   2. User clicks magic link → browser lands here with ?code=...&next=/profile
 *   3. We exchange the code for a session → cookie set
 *   4. Redirect to ?next (default /account)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (code) {
    // Respect Vercel's x-forwarded-host for correct preview URL redirects.
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    const redirectUrl = isLocalEnv
      ? `${origin}${next}`
      : forwardedHost
      ? `https://${forwardedHost}${next}`
      : `${origin}${next}`;

    // Build the redirect response BEFORE exchanging the code so that
    // exchangeCodeForSession writes session cookies directly onto this
    // response. Using createClient() (next/headers cookies()) won't work
    // here because those cookies land on an internal store that is never
    // copied onto the NextResponse we return — the browser never sees them.
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure a profiles row exists for this user. There is no database
      // trigger on auth.users, so OAuth sign-ins (e.g. Discord) won't have
      // a row yet. ignoreDuplicates means this is a no-op for returning users.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
      }

      return response;
    }
  }

  // Something went wrong — send them back to sign-in with an error flag.
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
