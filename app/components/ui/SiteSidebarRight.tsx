/**
 * Trailing-edge (right) sidebar — desktop / landscape-tablet only.
 *
 * Carries the external links that used to sit in the bottom block of the
 * mobile nav panel. Paired with SiteSidebar on the leading edge; both rails
 * are `hidden lg:flex`. Root layout reserves space with `lg:pr-64` on the
 * page wrapper.
 *
 * No brand mark here by design — the logo lives on the left rail only.
 * A header-height spacer keeps the first link visually aligned with the
 * auth item on the left rail (which sits below the logo).
 *
 * Keep this list in sync with MobileNavMenu's EXTERNAL_LINKS.
 */
export default function SiteSidebarRight() {
  const EXTERNAL_LINKS = [
    { href: "https://tcgdexter.beehiiv.com/", label: "TCG News" },
    { href: "https://discord.gg/G3VfEzfmJF", label: "Discord" },
    { href: "https://www.tiktok.com/@tcgdexter", label: "TikTok" },
    { href: "https://www.ebay.com/usr/tcgdexter", label: "Card Shop" },
  ];

  const linkClass =
    "block px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition-colors";

  return (
    <aside
      aria-label="External links"
      className="hidden lg:flex fixed inset-y-0 right-0 z-30 w-64 flex-col bg-bg border-l border-[var(--border)]"
    >
      {/* Header spacer — same height as the logo block on the left rail,
          so the first link here visually lines up with the auth item there. */}
      <div className="flex-shrink-0 h-20" aria-hidden="true" />

      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
        <ul className="flex flex-col gap-0.5">
          {EXTERNAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
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
