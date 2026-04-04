/* ─── Link data ─────────────────────────────────────────────── */

const links = [
  {
    title: "Deck Profiler",
    description: "Learn from your deck list",
    href: "/deck-profiler",
    badge: "Beta",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
  },
  {
    title: "Meta Decks",
    description: "Explore the current Standard meta",
    href: "/meta-decks",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.601a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
  },
  {
    title: "TCG News",
    description: "Stay in the know",
    href: "https://tcgdexter.beehiiv.com/",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    title: "Shop the Collection",
    description: "Fill up your binder",
    href: "https://www.ebay.com/usr/tcgdexter",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a.75.75 0 0 1 .218-.53l7.5-7.5a.75.75 0 0 1 1.064 0l7.5 7.5a.75.75 0 0 1 .218.53" />
      </svg>
    ),
    external: true,
  },
  {
    title: "Buy List",
    description: "Sell your collection",
    href: "/buy-list",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    ),
  },
  {
    title: "Watch on TikTok",
    description: "Deck techs, pack rips, and more",
    href: "https://www.tiktok.com/@tcgdexter",
    external: true,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.21 8.21 0 0 0 4.76 1.5v-3.4a4.85 4.85 0 0 1-1-.12Z" />
      </svg>
    ),
  },
];

/* ─── Page ──────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 pt-20 pb-16 px-6 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Dexter
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-text-secondary max-w-md mx-auto leading-relaxed">
          Collect. Compete.
        </p>
      </header>

      {/* ── Links ────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg flex flex-col gap-4">
          {links.map((link) => (
            <a
              key={link.title}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="card-lift group relative flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4 backdrop-blur-sm transition-colors hover:border-accent/30 hover:bg-surface-2"
            >
              {/* Icon */}
              <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-bg text-text-secondary group-hover:text-accent transition-colors">
                {link.icon}
              </span>

              {/* Text */}
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary text-sm sm:text-base">
                    {link.title}
                  </span>
                  {link.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                      {link.badge}
                    </span>
                  )}
                </span>
                <span className="block text-sm text-text-secondary mt-0.5 truncate">
                  {link.description}
                </span>
              </span>

              {/* Arrow */}
              <svg
                className="flex-shrink-0 w-4 h-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
          ))}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="flex-shrink-0 pt-8 px-6 text-center text-sm text-text-muted" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
        <p className="mt-3 max-w-lg mx-auto text-xs text-text-muted/70 leading-relaxed">
          TCG Dexter is an independent organization. The information presented on this website about the Pokémon Trading Card Game, including images and text, is intellectual property of The Pokémon Company, Nintendo, Game Freak, Creatures and/or Wizards of the Coast. TCG Dexter is not produced by, endorsed by, supported by, or affiliated with any of these companies.
        </p>
      </footer>
    </div>
  );
}
