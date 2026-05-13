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
 * Leading-edge (left) sidebar — desktop / landscape-tablet only.
 *
 * Paired with SiteSidebarRight, which carries the external links. Both rails
 * are `hidden lg:flex`; the mobile toolbar is `lg:hidden`, so the three
 * surfaces never overlap. Root layout reserves space with `lg:pl-64
 * lg:pr-64` on the page wrapper.
 *
 * Contents: centered logo, then auth item, then internal app routes.
 * No horizontal dividers — visual grouping is carried by the vertical
 * border alone.
 *
 * Keep the internal link list in sync with MobileNavMenu when nav items
 * change.
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

  // "/" gets exact match so it doesn't light up on every page; others match
  // by prefix so nested routes (e.g. /meta-decks/[slug]) still highlight.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const linkBase =
    "block px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkInactive = "text-text-secondary hover:text-text-primary hover:bg-surface";
  const linkActive = "text-text-primary bg-surface";

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-bg border-r border-[var(--border)]"
    >
      {/* Brand mark — centered. Height matches the mobile toolbar (h-14)
          for visual continuity, with extra breathing room beneath via the
          nav's pt-4. */}
      <div className="flex-shrink-0 h-14 px-5 flex items-center justify-center">
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
        </ul>
      </nav>
    </aside>
  );
}
