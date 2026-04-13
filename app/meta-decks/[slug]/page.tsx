import Link from "next/link";
import { notFound } from "next/navigation";
import archetypesRaw from "@/data/meta-archetypes.json";
import metaDecksRaw from "@/data/meta-decks.json";
import shopListingsRaw from "@/data/shop-listings.json";
import cardsRaw from "@/data/cards-standard.json";
import DeckListClient from "./DeckListClient";
import DeckPriceModule from "@/app/components/DeckPriceModule";
import RotationBanner from "@/app/components/RotationBanner";

/* ─── Types ────────────────────────────────────────────────────── */

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

interface ShopListing {
  title: string;
  price: number;
  currency: string;
  listingUrl: string;
}

/* ─── Static params ────────────────────────────────────────────── */

const archetypes = (archetypesRaw as Archetype[]).sort(
  (a, b) => b.total_entries - a.total_entries
);
const top30 = archetypes.slice(0, 30);

export function generateStaticParams() {
  return top30.map((a) => ({ slug: a.id }));
}

/* ─── Helpers ──────────────────────────────────────────────────── */

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

  // 1. Meta presence + trend
  if (a.representation_pct >= 0.1) {
    if (velocity > 0.01) {
      notes.push("Dominant and rising — the deck to beat right now.");
    } else if (velocity < -0.01) {
      notes.push("High meta presence but fading — pilots may be adapting away.");
    } else {
      notes.push("Firmly established — expect to face this at every locals.");
    }
  } else if (a.representation_pct >= 0.05) {
    if (velocity > 0.005) {
      notes.push("Gaining momentum — a rising threat in the current meta.");
    } else if (velocity < -0.005) {
      notes.push("Solid meta share, but trending down from recent peaks.");
    } else {
      notes.push("Consistent meta presence — a real threat at any table.");
    }
  } else {
    if (velocity > 0.003) {
      notes.push("Emerging archetype — entry numbers are climbing fast.");
    } else {
      notes.push("Niche presence — expect skilled, dedicated pilots.");
    }
  }

  // 2. Conversion efficiency (top cut relative to entries)
  if (a.conversion_rate >= 0.25) {
    notes.push("Elite conversion — the players running it are reaching top cut at an exceptional rate.");
  } else if (a.conversion_rate >= 0.15) {
    notes.push("Strong conversion — the deck delivers when it gets into the right hands.");
  } else if (a.conversion_rate >= 0.08) {
    notes.push("Average conversion — entries and top cuts are roughly in proportion.");
  } else {
    notes.push("Low conversion — popular but underperforming in top cut finishes.");
  }

  // 3. Win rate signal (only if we have meaningful data)
  if (hasWinData) {
    if (winRate >= 0.55) {
      notes.push("Win rate is well above 50% — positive matchup spread across the field.");
    } else if (winRate >= 0.50) {
      notes.push("Win rate is slightly above breakeven — holds its own across matchups.");
    } else if (winRate >= 0.45) {
      notes.push("Win rate is just under 50% — may struggle against the current top decks.");
    } else {
      notes.push("Win rate is below 45% — the field is finding answers to this deck.");
    }
  }

  return notes.join(" ");
}

function findShopListings(cards: DeckCard[]): { title: string; price: number; listingUrl: string }[] {
  const listings = shopListingsRaw as Record<string, ShopListing[]>;
  const seen = new Set<string>();
  const results: { title: string; price: number; listingUrl: string }[] = [];

  for (const card of cards) {
    const cardNameLower = card.name.toLowerCase();
    for (const [key, items] of Object.entries(listings)) {
      for (const item of items) {
        if (
          item.title.toLowerCase().includes(cardNameLower) &&
          !seen.has(item.listingUrl)
        ) {
          seen.add(item.listingUrl);
          results.push({
            title: item.title,
            price: item.price,
            listingUrl: item.listingUrl,
          });
        }
      }
    }
  }

  return results;
}

const ROTATING_MARKS = new Set(["A", "B", "C", "D", "E", "F", "G"]);

const ENERGY_HEX: Record<string, string> = {
  Fire:       "#d93232",
  Water:      "#0096d3",
  Grass:      "#64bf4b",
  Lightning:  "#f2b90c",
  Psychic:    "#9263a6",
  Fighting:   "#c56928",
  Darkness:   "#245B64",
  Metal:      "#7e949a",
  Dragon:     "#1a5276",
  Fairy:      "#fd79a8",
  Colorless:  "#b2bec3",
};

const ENERGY_NAME_MAP: Record<string, string> = {
  fire: "Fire", water: "Water", grass: "Grass", lightning: "Lightning",
  psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", dark: "Darkness",
  metal: "Metal", steel: "Metal", dragon: "Dragon", fairy: "Fairy",
};


interface CardPrinting {
  name: string;
  set_id: string;
  number: string;
  regulation_mark: string | null;
  market_price: number;
}

type CardsDb = Record<string, CardPrinting[]>;

function computeDeckPrice(cards: DeckCard[]): number {
  const db = cardsRaw as CardsDb;
  let total = 0;
  for (const card of cards) {
    const printings = db[card.name];
    if (!printings) continue;
    // Match by set code + number, fall back to cheapest printing
    const match =
      printings.find(
        (p) =>
          p.set_id.toUpperCase() === card.setCode.toUpperCase() &&
          p.number === card.number
      ) ?? printings.reduce((a, b) => (a.market_price < b.market_price ? a : b));
    total += (match.market_price ?? 0) * card.qty;
  }
  return Math.round(total * 100) / 100;
}

function getRotatingCards(cards: DeckCard[]): Array<{ name: string; qty: number }> {
  const db = cardsRaw as CardsDb;
  const rotating: Array<{ name: string; qty: number }> = [];
  for (const card of cards) {
    const printings = db[card.name];
    if (!printings) continue;
    const match =
      printings.find(
        (p) =>
          p.set_id.toUpperCase() === card.setCode.toUpperCase() &&
          p.number === card.number
      ) ?? printings[0];
    const mark = match?.regulation_mark?.toUpperCase();
    if (mark && ROTATING_MARKS.has(mark)) {
      rotating.push({ name: card.name, qty: card.qty });
    }
  }
  return rotating;
}

/* ─── Page ─────────────────────────────────────────────────────── */

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

  const shopResults = findShopListings(cards);
  const deckPrice = cards.length > 0 ? computeDeckPrice(cards) : 0;
  const rotatingCards = cards.length > 0 ? getRotatingCards(cards) : [];
  const isRotationReady = rotatingCards.length === 0;
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 pb-6 px-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}>

        <div className="max-w-lg mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-on-gradient-muted">
            #{rank} in Standard
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-gradient">
            {arch.name}
          </h1>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg space-y-8">
          {/* ── Stats Grid ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              }
              value={`${(arch.representation_pct * 100).toFixed(1)}%`}
              label="Meta Share"
              color="text-accent"
            />
            <StatCard
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.52.587 6.023 6.023 0 0 1-2.52-.587" />
                </svg>
              }
              value={String(arch.top_cut_entries)}
              label="Top Cut"
              color="text-yellow-500"
            />
            <StatCard
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-6L16.5 15m0 0L12 10.5m4.5 4.5V6" />
                </svg>
              }
              value={`${(arch.conversion_rate * 100).toFixed(1)}%`}
              label="Conversion"
              color="text-green-500"
            />
            <StatCard
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                </svg>
              }
              value={`${(winRate * 100).toFixed(0)}%`}
              label="Win Rate"
              color={winRate >= 0.55 ? "text-orange-400" : "text-text-secondary"}
            />
          </div>

          {/* ── Tournament Record ───────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              Tournament Record
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-500">
                {arch.wins}W
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
                {arch.losses}L
              </span>
              {arch.ties > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-text-muted/15 text-text-muted">
                  {arch.ties}T
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-text-primary">
              {arch.total_entries} total entries across recent Standard tournaments
            </p>
          </section>

          {/* ── Scouting Note ───────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              Scouting Note
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {scoutingNote}
            </p>
          </section>

          {/* ── Rotation Warning ─────────────────────────────── */}
          {cards.length > 0 && <RotationBanner rotatingCards={rotatingCards} />}

          {/* ── Deck Price ───────────────────────────────────── */}
          {deckPrice > 0 && (
            <DeckPriceModule deckPrice={deckPrice} />
          )}

          {/* ── Sample Deck List ─────────────────────────────── */}
          <section>
            <div className="rounded-xl bg-white p-4">
              <DeckListClient cards={cards} />
            </div>
          </section>

          {/* ── Shop Listings ────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-accent mb-3">
              Shop Listings
            </h3>
            {shopResults.length === 0 ? (
              <p className="text-sm text-text-muted italic">
                No cards from this deck in the shop right now.
              </p>
            ) : (
              <div className="rounded-xl bg-white overflow-hidden">
                {shopResults.map((item, i) => (
                  <a
                    key={i}
                    href={item.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-2 ${
                      i < shopResults.length - 1 ? "border-b border-bg" : ""
                    }`}
                  >
                    <span className="text-sm text-text-primary truncate mr-3">
                      {item.title}
                    </span>
                    <span className="text-sm font-medium text-accent flex-shrink-0">
                      ${item.price.toFixed(2)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────── */

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
    <div className="rounded-xl bg-white p-4">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
