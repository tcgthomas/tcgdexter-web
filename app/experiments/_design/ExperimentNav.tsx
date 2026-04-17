import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Sticky top nav used by every /experiments/* page.
 *
 * Auth-aware (server component): shows "Sign in + Get started" for anon users,
 * "Profile" link for authed users. All internal links route within the
 * /experiments sandbox so the design preview is self-contained.
 */
export default async function ExperimentNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/experiments/home" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#F2A20C] to-[#A60D0D] flex items-center justify-center text-[11px] font-black text-white">
            TD
          </div>
          <span className="font-semibold tracking-tight">Dexter</span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-text-muted border border-black/10 rounded-full px-2 py-0.5">
            Beta
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm text-text-secondary">
          <Link href="/experiments/my-decks" className="hover:text-text-primary transition">Decks</Link>
          <Link href="/experiments/meta-decks" className="hover:text-text-primary transition">Meta</Link>
          <Link href="/experiments/buy-list" className="hover:text-text-primary transition">Buy List</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/experiments/profile"
              className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
            >
              Profile
            </Link>
          ) : (
            <>
              <Link href="/experiments/sign-in" className="text-sm text-text-secondary hover:text-text-primary transition">
                Sign in
              </Link>
              <Link
                href="/experiments/sign-in"
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
