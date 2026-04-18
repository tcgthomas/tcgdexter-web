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

function getScoutingNote(a: Archetype): string {
  const winRate = getWinRate(a);
  const hasWinData = a.wins + a.losses + a.ties > 0;
  const velocity = a.velocity ?? 0;
  const notes: string[] = [];
  if (a.representation_pct >= 0.1) {
    if (velocity > 0.01) notes.push("Dominant and rising — the deck to beat right now.");
    else if (velocity < -0.01) notes.push("High meta presence but fading — pilots may be adapting away.");
    else notes.push("Firmly established — expect to face this at every locals.");
  } else if (a.representation_pct >= 0.05) {
    if (velocity > 0.005) notes.push("Gaining momentum — a rising threat in the current meta.");
    else if (velocity < -0.005) notes.push("Solid meta share, but trending down from recent peaks.");
    else notes.push("Consistent meta presence — a real threat at any table.");
  } else {
    if (velocity > 0.003) notes.push("Emerging archetype — entry numbers are climbing fast.");
    else notes.push("Niche presence — expect skilled, dedicated pilots.");
  }
  if (a.conversion_rate >= 0.25) notes.push("Elite conversion — the players running it are reaching top cut at an exceptional rate.");
  else if (a.conversion_rate >= 0.15) notes.push("Strong conversion — the deck delivers when it gets into the right hands.");
  else if (a.conversion_rate >= 0.08) notes.push("Average conversion — entries and top cuts are roughly in proportion.");
  else notes.push("Low conversion — popular but underperforming in top cut finishes.");
  if (hasWinData) {
    if (winRate >= 0.55) notes.push("Win rate is well above 50% — positive matchup spread across the field.");
    else if (winRate >= 0.5) notes.push("Win rate is slightly above breakeven — holds its own across matchups.");
    else if (winRate >= 0.45) notes.push("Win rate is just under 50% — may struggle against the current top decks.");
    else notes.push("Win rate is below 45% — the field is finding answers to this deck.");
  }
  return notes.join(" ");
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
  const scoutingNote = getScoutingNote(arch);
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

  // topSlot: meta-specific modules above the price module
  const topSlot = (
    <div className="flex flex-col gap-4">
      {/* Rank eyebrow */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#D91E0D]">
        #{rank} in Standard
      </p>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
          value={`${(arch.representation_pct * 100).toFixed(1)}%`}
          label="Meta Share"
          color="text-[#D91E0D]"
        />
        <StatCard
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.52.587 6.023 6.023 0 0 1-2.52-.587" />
            </svg>
          }
          value={String(arch.top_cut_entries)}
          label="Top Cut"
          color="text-[#F2A20C]"
        />
        <StatCard
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-6L16.5 15m0 0L12 10.5m4.5 4.5V6" />
            </svg>
          }
          value={`${(arch.conversion_rate * 100).toFixed(1)}%`}
          label="Conversion"
          color="text-emerald-600"
        />
        <StatCard
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            </svg>
          }
          value={`${(winRate * 100).toFixed(0)}%`}
          label="Win Rate"
          color={winRate >= 0.55 ? "text-[#F2A20C]" : "text-text-secondary"}
        />
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

  // postCtaSlot: rendered below the Save/Share button row
  const postCtaSlot = (
    <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm px-5 py-4">
      <h3 className="text-sm font-semibold text-text-primary mb-2">Scouting Note</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{scoutingNote}</p>
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
      topSlot={topSlot}
      postCtaSlot={postCtaSlot}
      footerCta={null}
    />
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-4">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
