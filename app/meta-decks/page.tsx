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
      <header className="flex-shrink-0 pb-8 px-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}>
        <div className="flex justify-center mb-4">
          <img
            src="/logo-light.png"
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "360px", height: "auto" }}
          />
        </div>
        <div className="mx-auto max-w-lg flex items-end justify-between">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Meta Decks
          </h1>
          <p className="text-sm text-text-secondary pb-1">
            Standard · Top 30
          </p>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl bg-surface overflow-hidden">
            {archetypes.map((arch, i) => (
              <Link
                key={arch.id}
                href={`/meta-decks/${arch.id}`}
                className={`group flex items-center gap-3 pl-3 pr-5 py-3.5 bg-white transition-colors hover:bg-surface-2 ${
                  i < archetypes.length - 1 ? "border-b border-bg" : ""
                }`}
              >
                {/* Rank */}
                <span className="flex-shrink-0 w-6 text-right text-base font-semibold text-text-secondary">
                  {i + 1}
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
