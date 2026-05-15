import archetypesRaw from "@/data/meta-archetypes.json";
import metaDecksRaw from "@/data/meta-decks.json";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { MetaDeckCard } from "@/app/components/DeckPostCard";
import { buildMetaAnalysis } from "@/lib/buildMetaAnalysis";

interface Archetype {
  id: string;
  name: string;
  total_entries: number;
  top_cut_entries: number;
  representation_pct: number;
  last_updated: string;
  image_url?: string;
}

interface DeckCard {
  qty: number;
  name: string;
  setCode: string;
  number: string;
  category: "pokemon" | "trainer" | "energy";
}

interface MetaDeck {
  id: string;
  cards: DeckCard[];
  variants?: { cards: DeckCard[]; creator?: string }[];
}

export default function MetaDecksPage() {
  const archetypes = (archetypesRaw as Archetype[])
    .sort((a, b) => b.total_entries - a.total_entries)
    .slice(0, 30);

  const metaDecks = metaDecksRaw as MetaDeck[];
  const lastUpdated = archetypes[0]?.last_updated;

  return (
    <main className="mx-auto max-w-6xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="flex items-end justify-between mb-8">
        <SectionHeader eyebrow="Live meta" title="Meta Decks" />
        <p className="text-sm text-text-secondary pb-1">Standard · Top 30</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {archetypes.map((arch, i) => {
          const deckData = metaDecks.find((d) => d.id === arch.id);
          const cards =
            deckData?.variants?.[0]?.cards ?? deckData?.cards ?? [];
          const analysis = buildMetaAnalysis(cards, {
            name: arch.name,
            rank: i + 1,
            conversionRate: 0,
            representationPct: arch.representation_pct,
          });
          const creators: string[] = [];
          for (const v of deckData?.variants ?? []) {
            const c = (v.creator ?? "").trim() || "Trainer";
            if (!creators.includes(c)) creators.push(c);
            if (creators.length >= 5) break;
          }
          return (
            <MetaDeckCard
              key={arch.id}
              id={arch.id}
              name={arch.name}
              rank={i + 1}
              image_url={arch.image_url}
              top_cut_entries={arch.top_cut_entries}
              representation_pct={arch.representation_pct}
              price={analysis.deckPrice}
              creators={creators}
            />
          );
        })}
      </div>

      {lastUpdated && (
        <p className="mt-4 text-xs text-text-muted text-center">
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
