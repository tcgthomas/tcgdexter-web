"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import DeckPriceModule from "@/app/components/DeckPriceModule";
import ThemeColor from "@/app/components/ThemeColor";

/* ─── Types (mirrors API response) ───────────────────────────── */

interface ShopListing {
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  listingUrl: string;
  condition: string;
  bestOffer: boolean;
  itemId: string;
}

interface Card {
  qty: number;
  name: string;
  section: "pokemon" | "trainer" | "energy";
}

interface PokemonAbility {
  pokemonName: string;
  abilityName: string;
  description: string;
}

interface PokemonAttack {
  pokemonName: string;
  attackName: string;
  cost: string[];
  damage: string;
  description: string;
}

interface AnalysisResult {
  deckSize: number;
  sections: {
    pokemon: number;
    trainer: number;
    energy: number;
    pokemonRatio: string;
    trainerRatio: string;
    energyRatio: string;
  };
  pokemon: {
    totalCards: number;
    uniqueSpecies: number;
    basicCount: number;
    stage1Count: number;
    stage2Count: number;
    abilities: PokemonAbility[];
    attacks: PokemonAttack[];
  };
  trainer: {
    totalCards: number;
    uniqueCards: number;
    supporterCount: number;
    itemCount: number;
    toolCount: number;
    stadiumCount: number;
    details: Array<{ name: string; description: string }>;
  };
  energy: {
    totalCards: number;
    basicByType: Record<string, number>;
    basicCount: number;
    specialCount: number;
    specialDetails: Array<{ name: string; qty: number; description: string }>;
  };
  deckPrice: number;
  rotation: {
    ready: boolean;
    rotatingCount: number;
    rotatingCards: Array<{ name: string; qty: number }>;
  };
  metaMatch: {
    matched: boolean;
    archetypeName: string | null;
    matchPct: number | null;
    rank: number | null;
    conversionRate: number | null;
  };
  deckScore: {
    total: number;
    grade: string;
    rotation: number;
    consistency: number;
    evolution: number;
    energyFit: number;
  };
  cards: Card[];
  warnings: string[];
  shopMatches: Array<{
    cardName: string;
    listings: ShopListing[];
  }>;
}

/* ─── Energy type colors ─────────────────────────────────────── */

const ENERGY_COLORS: Record<string, string> = {
  Fire:      "bg-red-100 text-black border-red-200",
  Water:     "bg-blue-100 text-black border-blue-200",
  Grass:     "bg-green-100 text-black border-green-200",
  Lightning: "bg-yellow-100 text-black border-yellow-200",
  Psychic:   "bg-violet-100 text-black border-violet-200",
  Fighting:  "bg-amber-100 text-black border-amber-200",
  Darkness:  "bg-teal-200 text-black border-teal-400",
  Metal:     "bg-zinc-100 text-black border-zinc-200",
  Fairy:     "bg-pink-100 text-black border-pink-200",
  Dragon:    "bg-amber-100 text-black border-amber-200",
  Colorless: "bg-stone-100 text-black border-stone-200",
};

const ENERGY_LETTER: Record<string, string> = {
  Fire:      "R",
  Water:     "W",
  Grass:     "G",
  Lightning: "L",
  Psychic:   "P",
  Fighting:  "F",
  Darkness:  "D",
  Metal:     "M",
  Fairy:     "Y",
  Dragon:    "N",
  Colorless: "C",
};

/* ─── Energy hex colors (for gradient accent) ────────────────── */

const ENERGY_HEX: Record<string, string> = {
  Fire:       "#e74c3c",
  Water:      "#3498db",
  Grass:      "#27ae60",
  Lightning:  "#f1c40f",
  Psychic:    "#9b59b6",
  Fighting:   "#e67e22",
  Darkness:   "#2c3e50",
  Metal:      "#95a5a6",
  Dragon:     "#1a5276",
  Fairy:      "#fd79a8",
  Colorless:  "#b2bec3",
};

/* ─── Example deck list ──────────────────────────────────────── */

const EXAMPLE_DECK = `Pokémon: 18
3 Riolu MEG 76
3 Mega Lucario ex MEG 77
1 Lucario SVI 114
2 Makuhita MEG 72
2 Hariyama MEG 73
2 Lunatone MEG 74
2 Solrock MEG 75
1 Fezandipiti ex ASC 142
1 Squawkabilly ex PAL 169
1 Psyduck ASC 39

Trainer: 33
4 Iono PAL 185
3 Lillie's Determination MEG 119
2 Professor Turo's Scenario PAR 171
4 Fighting Gong MEG 116
4 Premium Power Pro MEG 124
3 Ultra Ball MEG 131
2 Nest Ball SVI 181
2 Night Stretcher ASC 196
2 Poké Pad ASC 198
1 Switch MEG 130
1 Tool Scrapper ASC 212
2 Air Balloon ASC 181
1 Maximum Belt TEF 154
1 Gravity Mountain SSP 177
1 Team Rocket's Watchtower DRI 180

Energy: 9
9 Basic {F} Energy MEE 6`;

/* ─── Energy cost pill ───────────────────────────────────────── */

function EnergyCostPill({ type }: { type: string }) {
  const colorClass =
    ENERGY_COLORS[type] ?? "bg-stone-100 text-stone-400 border-stone-200";
  const letter = ENERGY_LETTER[type] ?? type[0]?.toUpperCase() ?? "?";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border w-5 h-5 text-xs font-bold ${colorClass}`}
      title={type}
    >
      {letter}
    </span>
  );
}

/* ─── Collapsible section ───────────────────────────────────────── */

function CollapsibleSection({
  title,
  children,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border border-border bg-surface p-5 backdrop-blur-sm group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="text-lg font-semibold">{title}</h2>
        <svg
          className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>
      {badge && <div className="flex gap-2 flex-wrap mt-4 mb-4">{badge}</div>}
      <div className="mt-4">{children}</div>
    </details>
  );
}

function StatPill({ count, label }: { count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-3 py-1 text-sm text-text-secondary">
      <span className="font-semibold">{count}</span>
      <span className="font-normal">{label}</span>
    </span>
  );
}

/* ─── Page Component ─────────────────────────────────────────── */

export default function DeckProfilerPage() {
  const [deckList, setDeckList] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /* ── Share state ──────────────────────────────────────────── */
  const [sharing, setSharing] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  /* ── Dominant energy color for background gradient ────────── */
  const dominantColor = useMemo(() => {
    if (!result) return null;
    const entries = Object.entries(result.energy.basicByType);
    if (entries.length === 0) return null;
    const [topType] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    return ENERGY_HEX[topType] ?? null;
  }, [result]);

  useEffect(() => {
    if (dominantColor) {
      document.documentElement.style.setProperty("--energy-gradient", dominantColor + "55");
      document.documentElement.style.setProperty("--energy-bar", dominantColor);
    } else {
      document.documentElement.style.removeProperty("--energy-gradient");
      document.documentElement.style.removeProperty("--energy-bar");
    }
    return () => {
      document.documentElement.style.removeProperty("--energy-gradient");
      document.documentElement.style.removeProperty("--energy-bar");
    };
  }, [dominantColor]);

  async function handleShare() {
    if (!result || sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/deck-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckList, analysis: result }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        // Try modern clipboard API first, fall back to execCommand
        try {
          await navigator.clipboard.writeText(data.url);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = data.url;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }
    } catch {
      // silent fail
    } finally {
      setSharing(false);
    }
  }



  async function handleAnalyze() {
    if (!deckList.trim()) {
      setError("Paste your deck list first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckList }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadExample() {
    setDeckList(EXAMPLE_DECK);
    setResult(null);
    setError(null);
  }

  return (
    <div
      className={`min-h-screen flex flex-col profiler-bg${dominantColor ? " profiler-active" : ""}`}
      style={dominantColor ? { "--energy-accent": dominantColor } as React.CSSProperties : undefined}
    >
      {dominantColor && <ThemeColor color={dominantColor} />}
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 pt-12 pb-8 px-6 text-center">
        <div className="text-left mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Home
        </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Deck Profiler
        </h1>
        <p className="mt-3 text-xs text-text-muted max-w-md mx-auto">
          This feature is in beta. Please share your thoughts to{' '}
          <a href="mailto:feedback@tcgdexter.com" className="underline hover:text-text-secondary">feedback@tcgdexter.com</a>
        </p>

      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          {/* Input section */}
          <div className="rounded-xl border border-border bg-surface p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="deck-input"
                className="text-sm font-medium text-text-secondary"
              >
                Paste your Deck List
              </label>
              <button
                onClick={handleLoadExample}
                className="text-xs text-accent hover:text-accent-light transition-colors"
              >
                Load example
              </button>
            </div>

            <textarea
              id="deck-input"
              value={deckList}
              onChange={(e) => setDeckList(e.target.value)}
              placeholder={`Pokémon: 12\n4 Charizard ex OBF 125\n2 Charmander OBF 26\n...\n\nTrainer: 18\n4 Arven OBF 186\n...\n\nEnergy: 10\n10 Basic Fire Energy SVE 2`}
              rows={12}
              className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 resize-y [font-size:16px] sm:text-sm"
            />

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeckList(""); setResult(null); setError(null); }}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-border bg-bg px-5 py-2.5 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>

          {/* Rotation Countdown */}
          {result === null && (() => {
            const rotationDate = new Date("2026-04-10T00:00:00");
            const now = new Date();
            const daysLeft = Math.ceil((rotationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 0) return null;
            return (
              <div className="rounded-xl border border-border bg-surface px-6 py-5 flex items-center justify-center gap-5">
                <div className="text-6xl font-black text-text-primary leading-none">{daysLeft}</div>
                <div className="flex flex-col">
                  <div className="text-sm text-text-secondary uppercase tracking-widest">Days Until Rotation</div>
                  <div className="text-xs text-text-muted mt-1">April 10, 2026</div>
                </div>
              </div>
            );
          })()}

          {/* Results */}
          {result && (
            <div className="flex flex-col gap-4">

              {/* ── Deck Score ─────────────────────────────── */}
              {(() => {
                const { grade, rotation, consistency, evolution, energyFit } = result.deckScore;
                const rotatingCount = result.rotation.rotatingCards.length;

                const rotationStr = rotatingCount === 0
                  ? "Rotation Ready — all cards legal after April 10."
                  : rotatingCount <= 2
                  ? `${rotatingCount} card${rotatingCount > 1 ? "s" : ""} rotate${rotatingCount === 1 ? "s" : ""} out April 10 — minor updates needed.`
                  : "This deck does not survive 2026 Standard Format Rotation as-is.";

                const consistencyStr = consistency >= 22
                  ? "Strong draw engine with key supporters and search cards."
                  : consistency >= 15
                  ? "Decent consistency — a few more draw supporters could help."
                  : consistency >= 6
                  ? "Thin draw engine — this deck may struggle to set up reliably."
                  : "Missing core draw and search cards — consider building out your supporter and item line.";

                const evolutionStr = evolution >= 23
                  ? "Evolution lines look complete."
                  : evolution >= 15
                  ? "Most evolution lines intact — double-check your Stage 1 and Stage 2 ratios."
                  : "Incomplete evolution lines detected — this deck may struggle to evolve consistently.";

                const energyStr = energyFit === 25
                  ? "Energy count is in the optimal range."
                  : energyFit >= 15
                  ? "Energy count is slightly outside the typical range."
                  : "Energy count may be too high or too low for consistent attachment.";

                return (
                  <div className="rounded-xl border border-border bg-surface p-5 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-text-primary mb-3">Deck Notes</h2>
                    <ul className="flex flex-col gap-2 list-disc list-inside">
                      {[rotationStr, consistencyStr, evolutionStr, energyStr].map((str, i) => (
                        <li key={i} className="text-sm text-text-secondary">
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* ── Meta Match ────────────────────────────── */}
              {result.metaMatch.matched && (() => {
                const { archetypeName, matchPct, rank, conversionRate } = result.metaMatch;
                const pct = (conversionRate ?? 0) * 100;
                const presenceNote = (matchPct ?? 0) >= 0.1
                  ? "High meta presence — expect to see this at locals."
                  : (matchPct ?? 0) >= 0.05
                  ? "Solid meta share — a real threat at any table."
                  : "Niche presence — skilled pilots only.";
                const convNote = pct >= 30
                  ? "Exceptional conversion rate — the pilots who run it are winning."
                  : pct >= 15
                  ? "Good conversion — the deck delivers when it gets there."
                  : "Low conversion rate — entries outpace top cuts.";
                return (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 mb-2">
                          Top Meta Deck
                        </span>
                        <h2 className="text-xl font-bold text-green-900">{archetypeName}</h2>
                      </div>
                      <div className="text-right shrink-0">
                        {rank !== null && (
                          <p className="text-2xl font-black text-green-700 leading-none">#{rank}</p>
                        )}
                        <p className="text-xs text-green-600 mt-0.5">in Standard</p>
                      </div>
                    </div>
                    {matchPct !== null && (
                      <p className="text-xs text-green-700 mb-2 font-medium">
                        {(matchPct * 100).toFixed(0)}% match to known deck list
                      </p>
                    )}
                    <p className="text-sm text-green-700">{presenceNote} {convNote}</p>
                  </div>
                );
              })()}

              {/* ── Rotation Banner (blocked only) ─────────── */}
              {!result.rotation.ready && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Rotation Blocked</p>
                      <p className="text-xs text-amber-700 mt-0.5">{result.rotation.rotatingCount} card{result.rotation.rotatingCount !== 1 ? "s" : ""} not legal after April 10</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-7">
                    {result.rotation.rotatingCards.map((c) => (
                      <span key={c.name} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800">
                        <span className="font-semibold">{c.qty}</span>
                        <span>{c.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 1. Overview ─────────────────────────────── */}
              <div className="rounded-xl border border-border bg-surface p-5 backdrop-blur-sm">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-lg font-semibold">Overview</h2>
                  <span className="text-xs text-text-muted">{result.deckSize} cards</span>
                </div>

                {/* Segmented bar */}
                <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-2 mb-4">
                  {result.sections.pokemon > 0 && (
                    <div className="bg-blue-400 transition-all" style={{ width: `${(result.sections.pokemon / result.deckSize) * 100}%` }} />
                  )}
                  {result.sections.trainer > 0 && (
                    <div className="bg-stone-400 transition-all" style={{ width: `${(result.sections.trainer / result.deckSize) * 100}%` }} />
                  )}
                  {result.sections.energy > 0 && (
                    <div className="bg-yellow-400 transition-all" style={{ width: `${(result.sections.energy / result.deckSize) * 100}%` }} />
                  )}
                </div>

                {/* Stat row */}
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="pr-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Pokémon</p>
                    <p className="text-2xl font-bold text-text-primary">{result.sections.pokemon}</p>
                    <p className="text-xs text-text-muted mt-0.5">{result.sections.pokemonRatio}</p>
                  </div>
                  <div className="px-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Trainers</p>
                    <p className="text-2xl font-bold text-text-primary">{result.sections.trainer}</p>
                    <p className="text-xs text-text-muted mt-0.5">{result.sections.trainerRatio}</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Energy</p>
                    <p className="text-2xl font-bold text-text-primary">{result.sections.energy}</p>
                    <p className="text-xs text-text-muted mt-0.5">{result.sections.energyRatio}</p>
                  </div>
                </div>
              </div>

              {/* ── Share Button ──────────────────────────── */}
              <button
                onClick={handleShare}
                disabled={sharing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sharing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sharing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0 a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
                    </svg>
                    Share this Deck Profile
                  </>
                )}
              </button>

              {/* ── Pokémon Breakdown ──────────────────────── */}
              <CollapsibleSection
                title="Pok&eacute;mon"
                badge={
                  <>
                    {[
                      { count: result.pokemon.totalCards, label: "Total" },
                      { count: result.pokemon.uniqueSpecies, label: "Unique" },
                      ...(result.pokemon.basicCount > 0 ? [{ count: result.pokemon.basicCount, label: "Basic" }] : []),
                      ...(result.pokemon.stage1Count > 0 ? [{ count: result.pokemon.stage1Count, label: "Stage 1" }] : []),
                      ...(result.pokemon.stage2Count > 0 ? [{ count: result.pokemon.stage2Count, label: "Stage 2" }] : []),
                    ].map(({ count, label }) => (
                      <StatPill key={label} count={count} label={label} />
                    ))}
                  </>
                }
              >
                {/* Abilities */}
                {result.pokemon.abilities.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-text-secondary mb-2">Abilities</h3>
                    <div className="flex flex-col gap-3">
                      {(() => {
                        const grouped = result.pokemon.abilities.reduce<Record<string, PokemonAbility[]>>(
                          (acc, ab) => {
                            if (!acc[ab.pokemonName]) acc[ab.pokemonName] = [];
                            acc[ab.pokemonName].push(ab);
                            return acc;
                          },
                          {}
                        );
                        return Object.entries(grouped).map(([pokemonName, abilities]) => (
                          <div key={pokemonName} className="border border-border rounded-xl overflow-hidden">
                            <div className="bg-surface-2 px-4 py-2">
                              <span className="text-sm font-semibold text-text-primary">{pokemonName}</span>
                            </div>
                            <div className="divide-y divide-border">
                              {abilities.map((ab, i) => (
                                <div key={i} className="bg-bg px-4 py-3">
                                  <span className="font-semibold text-sm text-accent">{ab.abilityName}</span>
                                  {ab.description && (
                                    <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{ab.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Attacks */}
                {result.pokemon.attacks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary mb-2">Attacks</h3>
                    <div className="flex flex-col gap-3">
                      {(() => {
                        const grouped = result.pokemon.attacks.reduce<Record<string, PokemonAttack[]>>(
                          (acc, atk) => {
                            if (!acc[atk.pokemonName]) acc[atk.pokemonName] = [];
                            acc[atk.pokemonName].push(atk);
                            return acc;
                          },
                          {}
                        );
                        return Object.entries(grouped).map(([pokemonName, attacks]) => (
                          <div key={pokemonName} className="border border-border rounded-xl overflow-hidden">
                            <div className="bg-surface-2 px-4 py-2">
                              <span className="text-sm font-semibold text-text-primary">{pokemonName}</span>
                            </div>
                            <div className="divide-y divide-border">
                              {attacks.map((atk, i) => (
                                <div key={i} className="bg-bg px-4 py-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-semibold text-text-primary text-sm">{atk.attackName}</span>
                                    {atk.cost.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {atk.cost.map((type, j) => (
                                          <EnergyCostPill key={j} type={type} />
                                        ))}
                                      </div>
                                    )}
                                    {atk.damage && (
                                      <span className="ml-auto font-bold text-text-primary text-sm">{atk.damage}</span>
                                    )}
                                  </div>
                                  {atk.description && (
                                    <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{atk.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {result.pokemon.abilities.length === 0 && result.pokemon.attacks.length === 0 && (
                  <p className="text-sm text-text-muted italic">
                    No ability or attack data found.
                  </p>
                )}
              </CollapsibleSection>

              {/* ── Trainer Breakdown ──────────────────────── */}
              <CollapsibleSection
                title="Trainer"
                badge={
                  <>
                    {[
                      { count: result.trainer.totalCards, label: "Total" },
                      { count: result.trainer.uniqueCards, label: "Unique" },
                      ...(result.trainer.supporterCount > 0 ? [{ count: result.trainer.supporterCount, label: "Supporter" }] : []),
                      ...(result.trainer.itemCount > 0 ? [{ count: result.trainer.itemCount, label: "Item" }] : []),
                      ...(result.trainer.toolCount > 0 ? [{ count: result.trainer.toolCount, label: "Tool" }] : []),
                      ...(result.trainer.stadiumCount > 0 ? [{ count: result.trainer.stadiumCount, label: "Stadium" }] : []),
                    ].map(({ count, label }) => (
                      <StatPill key={label} count={count} label={label} />
                    ))}
                  </>
                }
              >
                {result.trainer.details.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {result.trainer.details.map((t) => (
                      <div key={t.name} className="border border-border rounded-xl overflow-hidden">
                        <div className="bg-surface-2 px-4 py-2">
                          <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                        </div>
                        <div className="bg-bg px-4 py-3">
                          <p className="text-xs text-text-secondary leading-relaxed">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">No trainer details available.</p>
                )}
              </CollapsibleSection>

              {/* ── Energy Breakdown ──────────────────────── */}
              <CollapsibleSection
                title="Energy"
                badge={
                  <>
                    {[
                      { count: result.energy.totalCards, label: "Total" },
                      ...Object.entries(result.energy.basicByType).map(([type, count]) => ({
                        count,
                        label: `Basic ${type}`,
                      })),
                      ...(result.energy.specialCount > 0 ? [{ count: result.energy.specialCount, label: "Special" }] : []),
                    ].map(({ count, label }) => (
                      <StatPill key={label} count={count} label={label} />
                    ))}
                  </>
                }
              >
                {result.energy.specialDetails.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {result.energy.specialDetails.map((e) => (
                      <div key={e.name} className="border border-border rounded-xl overflow-hidden">
                        <div className="bg-surface-2 px-4 py-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-text-primary">{e.name}</span>
                          <span className="text-xs text-text-secondary">&times;{e.qty}</span>
                        </div>
                        {e.description && (
                          <div className="bg-bg px-4 py-3">
                            <p className="text-xs text-text-secondary leading-relaxed">{e.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">No special energy details.</p>
                )}
              </CollapsibleSection>

              {/* ── Deck Price + Alert ──────────────────────── */}
              <DeckPriceModule deckPrice={result.deckPrice} deckList={deckList} />

              {/* ── Shop Matches ─────────────────────────────── */}
              {result.shopMatches.length > 0 && (
                <details className="rounded-xl border border-blue-200 bg-blue-50 p-5 group">
                  <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">Available in the Shop</h2>
                      <p className="text-xs text-text-muted mt-0.5">Check out cards from this deck on eBay</p>
                    </div>
                    <svg
                      className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="divide-y divide-border mt-4">
                    {result.shopMatches.flatMap((match) =>
                      match.listings.map((listing) => (
                        <div key={listing.itemId} className="py-3 flex items-center gap-4">
                          {listing.imageUrl && (
                            <img src={listing.imageUrl} alt={listing.title} className="w-12 h-12 object-contain rounded flex-shrink-0" />
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-semibold text-text-primary">{match.cardName}</span>
                            <span className="text-sm text-text-secondary">${listing.price.toFixed(2)}</span>
                          </div>
                          <a
                            href={listing.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            View
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              )}

              {/* ── Warnings ──────────────────────────────── */}
              {result.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-600/30 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                    Warnings
                  </h3>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-amber-700">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* ── Share Toast ─────────────────────────────────────── */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg animate-fade-toast">
          Link copied!
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
        <p className="mt-3 max-w-lg mx-auto text-xs text-text-muted/70 leading-relaxed">
          TCG Dexter is an independent organization. The information presented on this website about the Pokémon Trading Card Game, including images and text, is intellectual property of The Pokémon Company, Nintendo, Game Freak, Creatures and/or Wizards of the Coast. TCG Dexter is not produced by, endorsed by, supported by, or affiliated with any of these companies.
        </p>
      </footer>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */

function Stat({
  label,
  value,
  sub,
  color = "text-text-primary",
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0">{sub}</p>}
      <p className="text-xs text-text-secondary mt-0.5">{label}</p>
    </div>
  );
}
