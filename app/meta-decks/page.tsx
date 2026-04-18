import Link from "next/link";
import archetypesRaw from "@/data/meta-archetypes.json";
import SectionHeader from "@/app/components/ui/SectionHeader";

/**
 * Experiment mirror of /meta-decks. Same Top-30 list and JSON source.
 */

interface Archetype {
  id: string;
  name: string;
  total_entries: number;
  top_cut_entries: number;
  representation_pct: number;
  last_updated: string;
}

export default function MetaDecksPage() {
  const archetypes = (archetypesRaw as Archetype[])
    .sort((a, b) => b.total_entries - a.total_entries)
    .slice(0, 30);

  const lastUpdated = archetypes[0]?.last_updated;

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="flex items-end justify-between mb-8">
        <SectionHeader eyebrow="Live meta" title="Meta Decks" />
        <p className="text-sm text-text-secondary pb-1">Standard · Top 30</p>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
        {archetypes.map((arch, i) => (
          <Link
            key={arch.id}
            href={`/meta-decks/${arch.id}`}
            className={`group flex items-center gap-3 pl-5 pr-5 py-3.5 bg-white transition-colors hover:bg-[#fafafa] ${
              i < archetypes.length - 1 ? "border-b border-black/5" : ""
            }`}
          >
            <span className="flex-shrink-0 w-6 text-right text-base font-semibold text-text-secondary">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-text-primary text-lg truncate">
                {arch.name}
              </span>
              <span className="flex items-center gap-3 mt-0.5 text-xs font-semibold text-text-muted">
                <span>{arch.top_cut_entries} top cuts</span>
                <span>{arch.total_entries} entries</span>
              </span>
            </span>
            <svg
              className="flex-shrink-0 w-4 h-4 text-text-muted group-hover:text-[#D91E0D] group-hover:translate-x-0.5 transition-all"
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

      {lastUpdated && (
        <p className="mt-3 text-xs text-text-muted text-center">
          Last updated:{" "}
          {new Date(lastUpdated).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          })}
        </p>
      )}
      <p className="mt-1 text-xs text-text-muted/70 text-center">
        Data sourced from Limitless TCG · Updated weekly.
      </p>
    </main>
  );
}
