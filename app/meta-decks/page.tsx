import Link from "next/link";
import archetypesRaw from "@/data/meta-archetypes.json";

/* ─── Types ────────────────────────────────────────────────────── */

interface Archetype {
  id: string;
  name: string;
  total_entries: number;
  top_cut_entries: number;
  representation_pct: number;
  last_updated: string;
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function MetaDecksPage() {
  const archetypes = (archetypesRaw as Archetype[])
    .sort((a, b) => b.total_entries - a.total_entries)
    .slice(0, 30);

  const lastUpdated = archetypes[0]?.last_updated;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 pt-12 pb-8 px-6 text-center">
        <div className="text-left mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Home
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Meta Decks
        </h1>
        <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-md mx-auto leading-relaxed">
          Standard · Top 30
        </p>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {archetypes.map((arch, i) => (
              <Link
                key={arch.id}
                href={`/meta-decks/${arch.id}`}
                className={`group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2 ${
                  i < archetypes.length - 1 ? "border-b border-border" : ""
                }`}
              >
                {/* Rank */}
                <span className="flex-shrink-0 w-7 text-right text-xs font-medium text-text-muted">
                  #{i + 1}
                </span>

                {/* Info */}
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-text-primary text-sm truncate">
                    {arch.name}
                  </span>
                  <span className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                    <span>{arch.top_cut_entries} top cuts</span>
                    <span>{arch.total_entries} entries</span>
                  </span>
                </span>

                {/* Meta share */}
                <span className="flex-shrink-0 text-sm font-medium text-accent">
                  {(arch.representation_pct * 100).toFixed(1)}%
                </span>

                {/* Chevron */}
                <svg
                  className="flex-shrink-0 w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Footer info */}
          {lastUpdated && (
            <p className="mt-3 text-xs text-text-muted text-center">
              Last updated:{" "}
              {new Date(lastUpdated).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          <p className="mt-1 text-xs text-text-muted/70 text-center">
            Data sourced from Limitless TCG · Updated weekly.
          </p>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}
