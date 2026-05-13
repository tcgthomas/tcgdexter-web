import { createClient } from "@/lib/supabase/server";
import MobileNavMenu from "./MobileNavMenu";
import SiteSidebar from "./SiteSidebar";
import SiteSidebarRight from "./SiteSidebarRight";

/**
 * Site chrome rendered by the root layout on every page.
 *
 * Auth-aware (server component): fetches the user + display name once and
 * passes the payload to the mobile toolbar and the leading-edge sidebar.
 * The trailing-edge sidebar carries only external links and needs no auth
 * context. Responsive visibility is handled by the children:
 *   - MobileNavMenu lives inside a `lg:hidden` toolbar → hidden on lg+.
 *   - SiteSidebar + SiteSidebarRight are `hidden lg:flex` → hidden below lg.
 *
 * Mobile nav UI is intentionally unchanged. Root layout pairs the dual
 * rails with `lg:pl-64 lg:pr-64` on the page wrapper so content sits
 * between them.
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
    <>
      {/* Mobile / portrait-tablet: sticky top toolbar with hamburger. */}
      <nav
        data-site-toolbar
        className="lg:hidden sticky top-0 z-30 backdrop-blur-xl bg-bg/70"
      >
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center">
          <MobileNavMenu
            isAuthed={!!user}
            displayName={displayName}
            username={username}
            isAdmin={isAdmin}
          />
        </div>
      </nav>

      {/* Desktop / landscape-tablet: persistent dual sidebars. */}
      <SiteSidebar
        isAuthed={!!user}
        displayName={displayName}
        username={username}
        isAdmin={isAdmin}
      />
      <SiteSidebarRight />
    </>
  );
}
