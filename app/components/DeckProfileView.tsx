import Link from "next/link";
import DeckPriceModule from "@/app/components/DeckPriceModule";
import SaveDeckButton from "@/app/components/SaveDeckButton";
import StandardFormatInfo from "@/app/components/StandardFormatInfo";
import ThemeColor from "@/app/components/ThemeColor";
import EnergyColor from "@/app/components/EnergyColor";

/* ─── Types ──────────────────────────────────────────────────── */

export interface ShopListing {
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  listingUrl: string;
  condition: string;
  bestOffer: boolean;
  itemId: string;
}

export interface PokemonAbility {
  pokemonName: string;
  abilityName: string;
  description: string;
}

export interface PokemonAttack {
  pokemonName: string;
  attackName: string;
  cost: string[];
  damage: string;
  description: string;
}

export interface AnalysisResult {
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
  deckScore?: {
    total: number;
    grade: string;
    rotation: number;
    consistency: number;
    evolution: number;
    energyFit: number;
  };
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
  cards: Array<{ qty: number; name: string; section: string }>;
  warnings: string[];
  shopMatches: Array<{
    cardName: string;
    listings: ShopListing[];
  }>;
}

/* ─── Energy styling ─────────────────────────────────────────── */

export const ENERGY_HEX: Record<string, string> = {
  Fire: "#e74c3c",
  Water: "#3498db",
  Grass: "#27ae60",
  Lightning: "#f1c40f",
  Psychic: "#9b59b6",
  Fighting: "#e67e22",
  Darkness: "#2c3e50",
  Metal: "#95a5a6",
  Dragon: "#1a5276",
  Fairy: "#fd79a8",
  Colorless: "#b2bec3",
};

const ENERGY_COLORS: Record<string, string> = {
  Fire: "bg-red-100 text-black border-red-200",
  Water: "bg-blue-100 text-black border-blue-200",
  Grass: "bg-green-100 text-black border-green-200",
  Lightning: "bg-yellow-100 text-black border-yellow-200",
  Psychic: "bg-violet-100 text-black border-violet-200",
  Fighting: "bg-amber-100 text-black border-amber-200",
  Darkness: "bg-teal-200 text-black border-teal-400",
  Metal: "bg-zinc-100 text-black border-zinc-200",
  Fairy: "bg-pink-100 text-black border-pink-200",
  Dragon: "bg-amber-100 text-black border-amber-200",
  Colorless: "bg-stone-100 text-black border-stone-200",
};

const ENERGY_LETTER: Record<string, string> = {
  Fire: "R",
  Water: "W",
  Grass: "G",
  Lightning: "L",
  Psychic: "P",
  Fighting: "F",
  Darkness: "D",
  Metal: "M",
  Fairy: "Y",
  Dragon: "N",
  Colorless: "C",
};

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

/* ─── DeckProfileView ────────────────────────────────────────── */

interface Props {
  deckList: string;
  analysis: AnalysisResult;
  profiledAt: string;
  /** Page heading; defaults to "Deck Profile". */
  pageTitle?: string;
  /** Subtitle line below the heading; defaults to "Created on <date>". */
  subtitle?: string;
  /** Footer CTA content; defaults to a "Profile your own deck" link. */
  footerCta?: React.ReactNode;
}

/**
 * Full deck profile view. Used by both the public shared-deck page
 * (/d/[shortId]) and the private saved-deck view (/my-decks/[id]).
 *
 * Server component that embeds a handful of client islands (DeckPriceModule,
 * SaveDeckButton, StandardFormatInfo, ThemeColor, EnergyColor).
 */
export default function DeckProfileView({
  deckList,
  analysis,
  profiledAt,
  pageTitle = "Deck Profile",
  subtitle,
  footerCta,
}: Props) {
  const result = analysis;
  const dateStr = new Date(profiledAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const effectiveSubtitle = subtitle ?? `Created on ${dateStr}`;

  const energyEntries = Object.entries(result.energy.basicByType ?? {});
  const dominantEnergyType =
    energyEntries.length > 0
      ? energyEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      : null;
  const dominantColor = dominantEnergyType
    ? ENERGY_HEX[dominantEnergyType] ?? null
    : null;

  const defaultFooterCta = (
    <Link
      href="/"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-light"
    >
      Profile your own deck
    </Link>
  );

  return (
    <div
      className={`min-h-dvh flex flex-col profiler-bg${dominantColor ? " profiler-active" : ""}`}
      style={
        dominantColor
          ? ({ "--energy-accent": dominantColor } as React.CSSProperties)
          : undefined
      }
    >
      {dominantColor && <EnergyColor hex={dominantColor} />}
      {dominantColor && <ThemeColor color={dominantColor} />}

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 pb-8 px-6 text-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <div className="flex justify-center mb-4">
          <img
            src="/logo-dark.png"
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "450px", height: "auto" }}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-gradient">
          {pageTitle}
        </h1>
        <p className="mt-2 text-sm text-on-gradient-muted">
          {effectiveSubtitle}
        </p>
      </header>

      {/* ── Results ────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {/* Meta Match */}
          {result.metaMatch.matched && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center rounded-full border border-green-500/50 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 mb-2">
                    Top Meta Deck
                  </span>
                  <h2 className="text-xl font-bold text-text-primary">
                    {result.metaMatch.archetypeName}
                  </h2>
                </div>
                {result.metaMatch.matchPct !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-green-600 leading-none">
                      {(result.metaMatch.matchPct * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      meta share
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-2">
                This deck matches a recognized archetype in the current top 20
                meta.
              </p>
            </div>
          )}

          {/* Standard Format legality warning (only when not legal) */}
          {!result.rotation.ready && (
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <svg
                  className="w-4 h-4 text-yellow-500 flex-shrink-0"
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-text-primary">
                      Not legal in Standard Format
                    </p>
                    <StandardFormatInfo />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {result.rotation.rotatingCount} card
                    {result.rotation.rotatingCount !== 1 ? "s" : ""} no longer
                    legal
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-7">
                {result.rotation.rotatingCards.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1 rounded-full border border-yellow-500/50 bg-yellow-500/10 px-2.5 py-0.5 text-xs text-text-secondary"
                  >
                    <span className="font-semibold">{c.qty}</span>
                    <span>{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overview */}
          <div className="rounded-xl border border-border bg-surface p-5 backdrop-blur-sm">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold">Overview</h2>
              <span className="text-xs text-text-muted">
                {result.deckSize} cards
              </span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-2 mb-4">
              {result.sections.pokemon > 0 && (
                <div
                  className="bg-blue-400 transition-all"
                  style={{
                    width: `${(result.sections.pokemon / result.deckSize) * 100}%`,
                  }}
                />
              )}
              {result.sections.trainer > 0 && (
                <div
                  className="bg-stone-400 transition-all"
                  style={{
                    width: `${(result.sections.trainer / result.deckSize) * 100}%`,
                  }}
                />
              )}
              {result.sections.energy > 0 && (
                <div
                  className="bg-yellow-400 transition-all"
                  style={{
                    width: `${(result.sections.energy / result.deckSize) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="pr-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Pok&eacute;mon
                </p>
                <p className="text-2xl font-bold text-text-primary">
                  {result.sections.pokemon}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {result.sections.pokemonRatio}
                </p>
              </div>
              <div className="px-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Trainers
                </p>
                <p className="text-2xl font-bold text-text-primary">
                  {result.sections.trainer}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {result.sections.trainerRatio}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                  Energy
                </p>
                <p className="text-2xl font-bold text-text-primary">
                  {result.sections.energy}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {result.sections.energyRatio}
                </p>
              </div>
            </div>
          </div>

          {/* Deck Notes */}
          {result.deckScore &&
            (() => {
              const { consistency, evolution, energyFit } = result.deckScore!;
              const rotatingCount = result.rotation.rotatingCards.length;

              const rotationStr =
                rotatingCount === 0
                  ? "All cards legal in 2026 Standard Format."
                  : rotatingCount <= 2
                    ? `${rotatingCount} card${rotatingCount > 1 ? "s" : ""} no longer legal in Standard — minor updates needed.`
                    : "Several cards in this deck are no longer legal in Standard Format.";

              const consistencyStr =
                consistency >= 22
                  ? "Strong draw engine with key supporters and search cards."
                  : consistency >= 15
                    ? "Decent consistency — a few more draw supporters could help."
                    : consistency >= 6
                      ? "Thin draw engine — this deck may struggle to set up reliably."
                      : "Missing core draw and search cards — consider building out your supporter and item line.";

              const evolutionStr =
                evolution >= 23
                  ? "Evolution lines look complete."
                  : evolution >= 15
                    ? "Most evolution lines intact — double-check your Stage 1 and Stage 2 ratios."
                    : "Incomplete evolution lines detected — this deck may struggle to evolve consistently.";

              const energyStr =
                energyFit === 25
                  ? "Energy count is in the optimal range."
                  : energyFit >= 15
                    ? "Energy count is slightly outside the typical range."
                    : "Energy count may be too high or too low for consistent attachment.";

              return (
                <div className="rounded-xl border border-border bg-surface p-5 backdrop-blur-sm">
                  <h2 className="text-lg font-semibold text-text-primary mb-3">
                    Deck Notes
                  </h2>
                  <ul className="flex flex-col gap-2 list-disc list-inside">
                    <li className="text-sm text-text-secondary">
                      <span>{rotationStr}</span>
                      <span className="inline-flex align-middle ml-1">
                        <StandardFormatInfo />
                      </span>
                    </li>
                    {[consistencyStr, evolutionStr, energyStr].map(
                      (str, i) => (
                        <li key={i} className="text-sm text-text-secondary">
                          {str}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              );
            })()}

          {/* Estimated Deck Price */}
          <DeckPriceModule deckPrice={result.deckPrice} />

          {/* Save Deck button — adds the deck to the viewer's My Decks
              collection. Signed-out users get a sign-in prompt modal. */}
          <SaveDeckButton
            deckList={deckList}
            analysis={result}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-text-primary px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Pokemon */}
          <CollapsibleSection
            title="Pok&eacute;mon"
            badge={
              <>
                {[
                  { count: result.pokemon.totalCards, label: "Total" },
                  { count: result.pokemon.uniqueSpecies, label: "Unique" },
                  ...(result.pokemon.basicCount > 0
                    ? [{ count: result.pokemon.basicCount, label: "Basic" }]
                    : []),
                  ...(result.pokemon.stage1Count > 0
                    ? [{ count: result.pokemon.stage1Count, label: "Stage 1" }]
                    : []),
                  ...(result.pokemon.stage2Count > 0
                    ? [{ count: result.pokemon.stage2Count, label: "Stage 2" }]
                    : []),
                ].map(({ count, label }) => (
                  <StatPill key={label} count={count} label={label} />
                ))}
              </>
            }
          >
            {result.pokemon.abilities.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-text-secondary mb-2">
                  Abilities
                </h3>
                <div className="flex flex-col gap-3">
                  {(() => {
                    const grouped = result.pokemon.abilities.reduce<
                      Record<string, PokemonAbility[]>
                    >((acc, ab) => {
                      if (!acc[ab.pokemonName]) acc[ab.pokemonName] = [];
                      acc[ab.pokemonName].push(ab);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(
                      ([pokemonName, abilities]) => (
                        <div
                          key={pokemonName}
                          className="border border-border rounded-xl overflow-hidden"
                        >
                          <div className="bg-surface-2 px-4 py-2">
                            <span className="text-sm font-semibold text-text-primary">
                              {pokemonName}
                            </span>
                          </div>
                          <div className="divide-y divide-border">
                            {abilities.map((ab, i) => (
                              <div key={i} className="bg-bg px-4 py-3">
                                <span className="font-semibold text-sm text-accent">
                                  {ab.abilityName}
                                </span>
                                {ab.description && (
                                  <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                                    {ab.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    );
                  })()}
                </div>
              </div>
            )}

            {result.pokemon.attacks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-2">
                  Attacks
                </h3>
                <div className="flex flex-col gap-3">
                  {(() => {
                    const grouped = result.pokemon.attacks.reduce<
                      Record<string, PokemonAttack[]>
                    >((acc, atk) => {
                      if (!acc[atk.pokemonName]) acc[atk.pokemonName] = [];
                      acc[atk.pokemonName].push(atk);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(
                      ([pokemonName, attacks]) => (
                        <div
                          key={pokemonName}
                          className="border border-border rounded-xl overflow-hidden"
                        >
                          <div className="bg-surface-2 px-4 py-2">
                            <span className="text-sm font-semibold text-text-primary">
                              {pokemonName}
                            </span>
                          </div>
                          <div className="divide-y divide-border">
                            {attacks.map((atk, i) => (
                              <div key={i} className="bg-bg px-4 py-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-semibold text-text-primary text-sm">
                                    {atk.attackName}
                                  </span>
                                  {atk.cost.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {atk.cost.map((type, j) => (
                                        <EnergyCostPill key={j} type={type} />
                                      ))}
                                    </div>
                                  )}
                                  {atk.damage && (
                                    <span className="ml-auto font-bold text-text-primary text-sm">
                                      {atk.damage}
                                    </span>
                                  )}
                                </div>
                                {atk.description && (
                                  <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                                    {atk.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    );
                  })()}
                </div>
              </div>
            )}

            {result.pokemon.abilities.length === 0 &&
              result.pokemon.attacks.length === 0 && (
                <p className="text-sm text-text-muted italic">
                  No ability or attack data found.
                </p>
              )}
          </CollapsibleSection>

          {/* Trainer */}
          <CollapsibleSection
            title="Trainer"
            badge={
              <>
                {[
                  { count: result.trainer.totalCards, label: "Total" },
                  { count: result.trainer.uniqueCards, label: "Unique" },
                  ...(result.trainer.supporterCount > 0
                    ? [
                        {
                          count: result.trainer.supporterCount,
                          label: "Supporter",
                        },
                      ]
                    : []),
                  ...(result.trainer.itemCount > 0
                    ? [{ count: result.trainer.itemCount, label: "Item" }]
                    : []),
                  ...(result.trainer.toolCount > 0
                    ? [{ count: result.trainer.toolCount, label: "Tool" }]
                    : []),
                  ...(result.trainer.stadiumCount > 0
                    ? [
                        {
                          count: result.trainer.stadiumCount,
                          label: "Stadium",
                        },
                      ]
                    : []),
                ].map(({ count, label }) => (
                  <StatPill key={label} count={count} label={label} />
                ))}
              </>
            }
          >
            {result.trainer.details.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.trainer.details.map((t) => (
                  <div
                    key={t.name}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <div className="bg-surface-2 px-4 py-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {t.name}
                      </span>
                    </div>
                    <div className="bg-bg px-4 py-3">
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">
                No trainer details available.
              </p>
            )}
          </CollapsibleSection>

          {/* Energy */}
          <CollapsibleSection
            title="Energy"
            badge={
              <>
                {[
                  { count: result.energy.totalCards, label: "Total" },
                  ...Object.entries(result.energy.basicByType).map(
                    ([type, count]) => ({
                      count,
                      label: `Basic ${type}`,
                    }),
                  ),
                  ...(result.energy.specialCount > 0
                    ? [
                        {
                          count: result.energy.specialCount,
                          label: "Special",
                        },
                      ]
                    : []),
                ].map(({ count, label }) => (
                  <StatPill key={label} count={count} label={label} />
                ))}
              </>
            }
          >
            {result.energy.specialDetails.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.energy.specialDetails.map((e) => (
                  <div
                    key={e.name}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <div className="bg-surface-2 px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">
                        {e.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        &times;{e.qty}
                      </span>
                    </div>
                    {e.description && (
                      <div className="bg-bg px-4 py-3">
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {e.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">
                No special energy details.
              </p>
            )}
          </CollapsibleSection>

          {/* Shop Matches */}
          {result.shopMatches.length > 0 && (
            <details className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-5 group">
              <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Available in the Shop
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Check out cards from this deck on eBay
                  </p>
                </div>
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
              <div className="divide-y divide-border mt-4">
                {result.shopMatches.flatMap((match) =>
                  match.listings.map((listing) => (
                    <div
                      key={listing.itemId}
                      className="py-3 flex items-center gap-4"
                    >
                      {listing.imageUrl && (
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          className="w-12 h-12 object-contain rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold text-text-primary">
                          {match.cardName}
                        </span>
                        <span className="text-sm text-text-secondary">
                          ${listing.price.toFixed(2)}
                        </span>
                      </div>
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-md border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        View
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  )),
                )}
              </div>
            </details>
          )}

          {/* Warnings */}
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

          {/* Footer CTA */}
          <div className="text-center mt-4">{footerCta ?? defaultFooterCta}</div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="flex-shrink-0 pt-8 px-6 text-center text-sm text-text-muted"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
      >
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
        <p className="mt-3 max-w-lg mx-auto text-xs text-text-muted/70 leading-relaxed">
          TCG Dexter is an independent organization. The information presented
          on this website about the Pok&eacute;mon Trading Card Game,
          including images and text, is intellectual property of The Pokémon
          Company, Nintendo, Game Freak, Creatures and/or Wizards of the
          Coast. TCG Dexter is not produced by, endorsed by, supported by, or
          affiliated with any of these companies.
        </p>
      </footer>
    </div>
  );
}
