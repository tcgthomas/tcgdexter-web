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

  let displayName: string | null = null;
  let username: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username, is_admin")
      .eq("id", user.id)
      .single();
    displayName = data?.display_name ?? null;
    username = data?.username ?? null;
    isAdmin = data?.is_admin ?? false;
  }

  return (
    <nav data-site-toolbar className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center">
        <MobileNavMenu
          isAuthed={!!user}
          displayName={displayName}
          username={username}
          isAdmin={isAdmin}
        />
      </div>
    </nav>
  );
}
