"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  /** Passed from the server component so the auth item renders correctly. */
  isAuthed: boolean;
  /** User's display name from the profiles table; null for anon users. */
  displayName: string | null;
  /** User's username handle; used to build the profile link. */
  username: string | null;
  /** Whether the user has admin/judge privileges. (Reserved for future use.) */
  isAdmin?: boolean;
}

/**
 * Persistent left sidebar — desktop / landscape-tablet only.
 *
 * Rendered alongside the mobile top toolbar by SiteNav. Visibility is purely
 * a Tailwind responsive concern: the sidebar is `hidden lg:flex` and the
 * mobile toolbar is `lg:hidden`, so there's never a moment where both
 * occupy the viewport.
 *
 * Layout contract: the root layout adds `lg:pl-64` to the page wrapper so
 * page content (and footer) shift right of the sidebar. The sidebar itself
 * is fixed-positioned, so it does not participate in document flow.
 *
 * Link sections mirror MobileNavMenu exactly — keep them in sync when nav
 * items change.
 */
export default function SiteSidebar({
  isAuthed,
  displayName,
  username,
}: Props) {
  const pathname = usePathname();

  const INTERNAL_LINKS = [
    { href: "/", label: "Create a Deck Profile" },
    { href: "/meta-decks", label: "Top 30 Meta Decks" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/learn", label: "Learn to Play" },
  ];

  const EXTERNAL_LINKS = [
    { href: "https://tcgdexter.beehiiv.com/", label: "TCG News" },
    { href: "https://discord.gg/G3VfEzfmJF", label: "Discord" },
    { href: "https://www.tiktok.com/@tcgdexter", label: "TikTok" },
    { href: "https://www.ebay.com/usr/tcgdexter", label: "Card Shop" },
  ];

  // Match against pathname for the active-link indicator. "/" gets exact
  // match so it doesn't light up on every page; other internals match by
  // prefix so nested routes (e.g. /meta-decks/[slug]) still highlight.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const linkBase =
    "block px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkInactive = "text-text-secondary hover:text-text-primary hover:bg-surface";
  const linkActive = "text-text-primary bg-surface";

  return (
    <aside
      aria-label="Site navigation"
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-bg border-r border-[var(--border)]"
    >
      {/* Brand mark — matches the 14-unit toolbar height on mobile for
          visual continuity, with extra breathing room beneath. */}
      <div className="flex-shrink-0 h-14 px-5 flex items-center">
        <Link href="/" aria-label="TCG Dexter — home" className="inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-light.png"
            alt="TCG Dexter"
            style={{ width: "140px", height: "auto" }}
          />
        </Link>
      </div>

      {/* Scrollable link well — shrinks gracefully on short viewports. */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
        <ul className="flex flex-col gap-0.5">
          {/* Auth item — top of nav, matches MobileNavMenu order. */}
          <li>
            {isAuthed ? (
              <Link
                href={username ? `/u/${username}` : "/settings"}
                className={`${linkBase} ${
                  username && isActive(`/u/${username}`) ? linkActive : linkInactive
                }`}
              >
                {displayName ?? "Profile"}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className={`${linkBase} ${isActive("/sign-in") ? linkActive : linkInactive}`}
              >
                Sign in
              </Link>
            )}
          </li>

          <li role="separator" className="my-3 border-t border-[var(--border)]" />

          {INTERNAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${linkBase} ${isActive(href) ? linkActive : linkInactive}`}
              >
                {label}
              </Link>
            </li>
          ))}

          <li role="separator" className="my-3 border-t border-[var(--border)]" />

          {EXTERNAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkBase} ${linkInactive}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
