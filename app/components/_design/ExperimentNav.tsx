import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNavMenu from "./MobileNavMenu";

/**
 * Sticky top nav rendered by the root layout on every page.
 *
 * Auth-aware (server component): shows "Sign in + Get started" for anon users,
 * "Profile" link for authed users.
 */
export default async function ExperimentNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav data-site-toolbar className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        {/* Universal nav trigger — monogram opens full-screen takeover */}
        <MobileNavMenu isAuthed={!!user} />
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/profile"
              className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
            >
              Profile
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-text-secondary hover:text-text-primary transition">
                Sign in
              </Link>
              <Link
                href="/sign-in"
                className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
