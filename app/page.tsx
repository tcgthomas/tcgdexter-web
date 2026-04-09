"use client";

import { useState, useEffect, useMemo } from "react";
import DeckPriceModule from "@/app/components/DeckPriceModule";
import RotationBanner from "@/app/components/RotationBanner";
import SaveDeckButton from "@/app/components/SaveDeckButton";
import StandardFormatInfo from "@/app/components/StandardFormatInfo";
import ThemeColor from "@/app/components/ThemeColor";
import { useTheme } from "@/app/components/ThemeProvider";
import Link from "next/link";

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
    archetypeId: string | null;
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
  const { theme } = useTheme();
  const [deckList, setDeckList] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /* ── Share state ──────────────────────────────────────────── */
  const [sharing, setSharing] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);


  /* ── Dominant energy color for background gradient ────────── */
  const dominantColor = useMemo(() => {
    if (!result) return null;
    const entries = Object.entries(result.energy.basicByType);
    if (entries.length === 0) return null;
    const [topType] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    return ENERGY_HEX[topType] ?? null;
  }, [result]);

  useEffect(() => {
    if (!dominantColor) {
      document.documentElement.style.removeProperty("--energy-color");
      document.documentElement.classList.remove("gradient-active");
      return;
    }
    // Read theme fresh inside the effect so light/dark switches are respected
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const bg = isDark ? [24, 19, 15] : [253, 248, 242];
    const r = parseInt(dominantColor.slice(1, 3), 16);
    const g = parseInt(dominantColor.slice(3, 5), 16);
    const b = parseInt(dominantColor.slice(5, 7), 16);
    const a = 0.20;
    const muted = `rgb(${Math.round(r*a + bg[0]*(1-a))},${Math.round(g*a + bg[1]*(1-a))},${Math.round(b*a + bg[2]*(1-a))})`;
    document.documentElement.style.setProperty("--energy-color", muted);
    document.documentElement.classList.add("gradient-active");
    return () => {
      document.documentElement.style.removeProperty("--energy-color");
      document.documentElement.classList.remove("gradient-active");
    };
  }, [dominantColor, theme]);

  async function handleShare() {
    if (!result || sharing) return;
    setSharing(true);
    setShareError(null);
    setShareUrl(null);
    try {
      const res = await fetch("/api/deck-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckList, analysis: result }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setShareUrl(data.url);
      } else {
        setShareError(data.error ?? "Failed to create share link.");
      }
    } catch {
      setShareError("Network error — please try again.");
    } finally {
      setSharing(false);
    }
  }

  /**
   * Called from within the share modal — fresh user gesture, so the
   * clipboard and navigator.share APIs work reliably across browsers
   * (including Safari, which refuses those APIs when the gesture chain
   * is broken by an earlier await).
   */
  async function handleNativeShare() {
    if (!shareUrl) return;
    if (typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "TCG Dexter — Deck Profile",
        text: "Check out this Pokémon TCG deck profile:",
        url: shareUrl,
      });
    } catch {
      // User cancelled or share failed — no-op, modal stays open.
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      // Clipboard blocked — leave the URL visible in the input for manual copy.
      setShareError("Couldn't copy automatically — select the URL above and copy manually.");
    }
  }

  function closeShareModal() {
    setShareUrl(null);
    setShareError(null);
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
      className={`min-h-dvh flex flex-col profiler-bg${dominantColor ? " profiler-active" : ""}`}
      style={dominantColor ? { "--energy-accent": dominantColor } as React.CSSProperties : undefined}
    >
      {dominantColor && <ThemeColor color={dominantColor} />}
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 pb-8 px-6 text-center" style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}>
        <div className="flex justify-center mb-4">
          <img
            src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "450px", height: "auto" }}
          />
        </div>
        <p className={`text-sm max-w-md mx-auto transition-colors leading-relaxed ${dominantColor ? "text-on-gradient-muted" : "text-text-secondary"}`}>
          Paste a Pokémon TCG deck list below for an instant Standard legality check, price estimate, archetype match, and card-level breakdown.
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

          {/* ── Beta notice ─────────────────────────────────── */}
          <p className={`text-xs max-w-md mx-auto text-center transition-colors ${dominantColor ? "text-on-gradient-muted" : "text-text-muted"}`}>
            Deck Profiler in beta. Share your thoughts with{' '}
            <a href="mailto:feedback@tcgdexter.com" className="underline hover:opacity-80">feedback@tcgdexter.com</a>
          </p>

          {/* Results */}
          {result && (
            <div className="flex flex-col gap-4">

              {/* ── Meta Match ────────────────────────────── */}
              {result.metaMatch.matched && (() => {
                const { archetypeName, archetypeId, matchPct, rank, conversionRate } = result.metaMatch;
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
                const Wrapper = archetypeId
                  ? ({ children }: { children: React.ReactNode }) => (
                      <Link href={`/meta-decks/${archetypeId}`} className="block rounded-xl border border-green-500/40 bg-green-500/10 p-5 transition-colors hover:bg-green-500/15 hover:border-green-500/60">
                        {children}
                      </Link>
                    )
                  : ({ children }: { children: React.ReactNode }) => (
                      <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5">{children}</div>
                    );
                return (
                  <Wrapper>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="inline-flex items-center rounded-full border border-green-500/50 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 mb-2">
                          Top Meta Deck
                        </span>
                        <h2 className="text-xl font-bold text-text-primary">{archetypeName}</h2>
                      </div>
                      <div className="text-right shrink-0">
                        {rank !== null && (
                          <p className="text-2xl font-black text-green-600 leading-none">#{rank}</p>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">in Standard</p>
                      </div>
                    </div>
                    {matchPct !== null && (
                      <p className="text-xs text-text-secondary mb-2 font-medium">
                        {(matchPct * 100).toFixed(0)}% match to known deck list
                      </p>
                    )}
                    <p className="text-sm text-text-secondary">{presenceNote} {convNote}</p>
                    {archetypeId && (
                      <p className="text-xs text-green-600 font-medium mt-3">View full meta breakdown →</p>
                    )}
                  </Wrapper>
                );
              })()}


              {/* ── Standard Format legality (warning only) ── */}
              <RotationBanner rotatingCards={result.rotation.rotatingCards} />


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


              {/* ── Deck Score ─────────────────────────────── */}
              {(() => {
                const { grade, rotation, consistency, evolution, energyFit } = result.deckScore;
                const rotatingCount = result.rotation.rotatingCards.length;

                const rotationStr = rotatingCount === 0
                  ? "All cards legal in 2026 Standard Format."
                  : rotatingCount <= 2
                  ? `${rotatingCount} card${rotatingCount > 1 ? "s" : ""} no longer legal in Standard — minor updates needed.`
                  : "Several cards in this deck are no longer legal in Standard Format.";

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
                      <li className="text-sm text-text-secondary">
                        <span>{rotationStr}</span>
                        <span className="inline-flex align-middle ml-1">
                          <StandardFormatInfo />
                        </span>
                      </li>
                      {[consistencyStr, evolutionStr, energyStr].map((str, i) => (
                        <li key={i} className="text-sm text-text-secondary">
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* ── Save + Share Buttons ──────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3">
                <SaveDeckButton
                  deckList={deckList}
                  analysis={result}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-text-primary px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Share
                    </>
                  )}
                </button>
              </div>

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
                <details className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-5 group">
                  <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">Available in the Shop</h2>
                      <p className="text-xs text-text-secondary mt-0.5">Check out cards from this deck on eBay</p>
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
                            className="flex-shrink-0 inline-flex items-center gap-1 rounded-md border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"
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
                <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-yellow-500"
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
                      <li key={i} className="text-sm text-text-secondary">
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

      {/* ── Share Modal ─────────────────────────────────────── */}
      {shareUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeShareModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Share this deck</h2>
              <button
                onClick={closeShareModal}
                aria-label="Close"
                className="text-text-muted hover:text-text-primary transition-colors -mt-1 -mr-1 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              Anyone with this link can view your deck profile.
            </p>

            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-xs"
            />

            {shareError && (
              <p className="mt-2 text-xs text-red-600">{shareError}</p>
            )}

            <div className="mt-4 flex gap-2">
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  onClick={handleNativeShare}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                  Share…
                </button>
              )}
              <button
                onClick={handleCopyShareUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-surface-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Copy-confirmation toast ─────────────────────────── */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg animate-fade-toast">
          Link copied!
        </div>
      )}

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
