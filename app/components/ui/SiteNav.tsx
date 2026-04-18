import { createClient } from "@/lib/supabase/server";
import MobileNavMenu from "./MobileNavMenu";

/**
 * Sticky top nav rendered by the root layout on every page.
 *
 * Auth-aware (server component): fetches user + display name, passes
 * both to MobileNavMenu. The toolbar itself contains only the hamburger
 * trigger — auth links live inside the slide-out panel.
 */
export default async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()
      ).data?.display_name ?? null
    : null;

  return (
    <nav data-site-toolbar className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center">
        <MobileNavMenu isAuthed={!!user} displayName={displayName} />
      </div>
    </nav>
  );
}
