import {
  NewspaperIcon,
  DiscordIcon,
  TikTokIcon,
  ShoppingBagIcon,
} from "./nav-icons";

/**
 * Trailing-edge (right) sidebar — desktop only (xl+, 1280 px).
 *
 * Carries the external links that used to sit in the bottom block of the
 * mobile nav panel. Paired with SiteSidebar on the leading edge; both rails
 * are `hidden xl:flex`. Root layout reserves space with `xl:pr-80` on the
 * page wrapper. Landscape iPad and smaller laptops stay on the mobile
 * hamburger.
 *
 * No brand mark here by design — the logo lives on the left rail only.
 * A header-height spacer matches the left rail's logo block so the first
 * link here lines up with the first internal link on the left (the auth
 * row on the left is bottom-anchored, not top).
 *
 * Keep this list in sync with MobileNavMenu's EXTERNAL_LINKS.
 */
export default function SiteSidebarRight() {
  const EXTERNAL_LINKS = [
    { href: "https://tcgdexter.beehiiv.com/", label: "TCG News", Icon: NewspaperIcon },
    { href: "https://discord.gg/G3VfEzfmJF", label: "Discord", Icon: DiscordIcon },
    { href: "https://www.tiktok.com/@tcgdexter", label: "TikTok", Icon: TikTokIcon },
    { href: "https://www.ebay.com/usr/tcgdexter", label: "Card Shop", Icon: ShoppingBagIcon },
  ];

  // Rows match SiteSidebar's geometry: gap-4 between icon and label, same
  // rounded-md pill on hover, text-lg label.
  const linkClass =
    "flex items-center gap-4 px-3 py-2 rounded-md text-lg font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition-colors";

  return (
    <aside
      aria-label="External links"
      className="hidden xl:flex fixed inset-y-0 right-0 z-30 w-80 flex-col bg-bg border-l border-[var(--border)]"
    >
      {/* Header spacer — same height as the logo block on the left rail,
          so the first link here visually lines up with the first internal
          route on the left. */}
      <div className="flex-shrink-0 h-20" aria-hidden="true" />

      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
        <ul className="flex flex-col gap-0.5">
          {EXTERNAL_LINKS.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <Icon />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
