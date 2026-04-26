import { notFound } from "next/navigation";
import archetypesRaw from "@/data/meta-archetypes.json";
import metaDecksRaw from "@/data/meta-decks.json";
import DeckProfileView from "@/app/components/DeckProfileView";
import { buildMetaAnalysis } from "@/lib/buildMetaAnalysis";

interface Archetype {
  id: string;
  name: string;
  total_entries: number;
  top_cut_entries: number;
  representation_pct: number;
  conversion_rate: number;
  wins: number;
  losses: number;
  ties: number;
  last_updated: string;
  velocity?: number;
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
  name: string;
  cards: DeckCard[];
}

const archetypes = (archetypesRaw as Archetype[]).sort(
  (a, b) => b.total_entries - a.total_entries,
);
const top30 = archetypes.slice(0, 30);

export function generateStaticParams() {
  return top30.map((a) => ({ slug: a.id }));
}

function getRank(id: string): number {
  return top30.findIndex((a) => a.id === id) + 1;
}

function getWinRate(a: Archetype): number {
  const total = a.wins + a.losses + a.ties;
  return total > 0 ? a.wins / total : 0;
}

function buildDeckList(cards: DeckCard[]): string {
  const groups: Record<string, DeckCard[]> = { pokemon: [], trainer: [], energy: [] };
  for (const card of cards) groups[card.category]?.push(card);
  const lines: string[] = [];
  for (const [label, group] of [
    ["Pokémon", groups.pokemon],
    ["Trainer", groups.trainer],
    ["Energy", groups.energy],
  ] as [string, DeckCard[]][]) {
    if (group.length === 0) continue;
    if (lines.length > 0) lines.push("");
    lines.push(`${label}: ${group.reduce((s, c) => s + c.qty, 0)}`);
    for (const c of group) lines.push(`${c.qty} ${c.name} ${c.setCode} ${c.number}`);
  }
  return lines.join("\n");
}

export default async function MetaDeckDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const arch = top30.find((a) => a.id === slug);
  if (!arch) notFound();

  const rank = getRank(arch.id);
  const winRate = getWinRate(arch);
  const deckData = (metaDecksRaw as MetaDeck[]).find((d) => d.id === arch.id);
  const cards = deckData?.cards ?? [];
  const deckList = buildDeckList(cards);

  const analysis = buildMetaAnalysis(cards, {
    name: arch.name,
    rank,
    conversionRate: arch.conversion_rate,
    representationPct: arch.representation_pct,
  });

  // Fallback profiledAt — meta decks use last_updated date
  const profiledAt = arch.last_updated
    ? new Date(arch.last_updated).toISOString()
    : new Date().toISOString();

  // preOverviewSlot: rank label sits above the Overview matrix
  const preOverviewSlot = (
    <p className="text-xs font-semibold uppercase tracking-widest text-[#D91E0D]">
      #{rank} in Standard
    </p>
  );

  // topSlot: stat cards + tournament record sit below the Overview matrix
  const topSlot = (
    <div className="flex flex-col gap-4">
      {/* Stats — single card, 4-column row */}
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm px-5 py-4">
        <div className="grid grid-cols-4">
          <div className="text-center">
            <p className="text-lg font-bold text-[#D91E0D]">{`${(arch.representation_pct * 100).toFixed(1)}%`}</p>
            <p className="text-xs text-text-muted mt-0.5">Meta Share</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#F2A20C]">{String(arch.top_cut_entries)}</p>
            <p className="text-xs text-text-muted mt-0.5">Top Cut</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{`${(arch.conversion_rate * 100).toFixed(1)}%`}</p>
            <p className="text-xs text-text-muted mt-0.5">Conversion</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${winRate >= 0.55 ? "text-[#F2A20C]" : "text-text-secondary"}`}>{`${(winRate * 100).toFixed(0)}%`}</p>
            <p className="text-xs text-text-muted mt-0.5">Win Rate</p>
          </div>
        </div>
      </div>

      {/* Tournament record */}
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm px-5 py-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Tournament Record</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            {arch.wins}W
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            {arch.losses}L
          </span>
          {arch.ties > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-black/5 text-text-muted">
              {arch.ties}T
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-text-primary">
          {arch.total_entries} total entries across recent Standard tournaments
        </p>
      </div>

      {cards.length === 0 && (
        <p className="text-sm text-text-muted italic">Deck list not yet available for this archetype.</p>
      )}
    </div>
  );

  return (
    <DeckProfileView
      variant="meta"
      deckList={deckList}
      analysis={analysis}
      profiledAt={profiledAt}
      pageTitle={arch.name}
      subtitle={false}
      preOverviewSlot={preOverviewSlot}
      topSlot={topSlot}
      footerCta={null}
    />
  );
}
