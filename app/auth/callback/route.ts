import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (code) {
    const supabase = await createClient();
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

      // Respect Vercel's x-forwarded-host for correct preview URL redirects.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Something went wrong — send them back to sign-in with an error flag.
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
