import Link from "next/link";
import DeckPriceModule from "@/app/components/DeckPriceModule";
import DeckListCard from "@/app/components/DeckListCard";
import MetaDeckListCarousel from "@/app/components/MetaDeckListCarousel";
import SaveDeckButton from "@/app/components/SaveDeckButton";
import ShareButton from "@/app/components/ShareButton";
import StandardFormatInfo from "@/app/components/StandardFormatInfo";
import { buildTypesByName, buildSubtypesByName } from "@/lib/cardTypes";

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
    /** @deprecated No longer read by the renderer — the Overview matrix now
     *  re-derives types from `cards` against the bundled card DB at render
     *  time (see `buildTypesByName` in `lib/cardTypes.ts`). Still emitted by
     *  the analyzer and persisted on older saved-deck rows; safe to ignore. */
    typesByName?: Record<string, string[]>;
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
  Fire:      "#d93232",
  Water:     "#0096d3",
  Grass:     "#64bf4b",
  Lightning: "#f2b90c",
  Psychic:   "#9263a6",
  Fighting:  "#c56928",
  Darkness:  "#245B64",
  Metal:     "#7e949a",
  Dragon:    "#1a5276",
  Fairy:     "#fd79a8",
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

/* ─── Deck composition matrix (experiments theme) ────────────── */

/**
 * Palette for basic-energy-typed squares in the composition matrix.
 * Standalone from ENERGY_HEX above so we can tune the matrix look
 * without rippling changes through every energy chip in the profile.
 */
const MATRIX_ENERGY_PALETTE: Record<string, string> = {
  Fire:      "#F1554B",
  Water:     "#3BBBE7",
  Grass:     "#57B060",
  Lightning: "#F3DC67",
  Psychic:   "#AC84A7",
  Fighting:  "#DF8524",
  Darkness:  "#318C98",
  Colorless: "#E8EDEC",
  // Not specified in latest palette; kept as reasonable defaults.
  Metal:     "#A8A8A8",
  Dragon:    "#D4A93A",
  Fairy:     "#E879A3",
};

/** Known ACE SPEC Trainer / Special Energy card names in Standard rotation.
 *  Extend as the list grows. Used to color-flag the square pink in the
 *  composition matrix. */
const ACE_SPEC_NAMES = new Set<string>([
  "Master Ball",
  "Prime Catcher",
  "Secret Box",
  "Maximum Belt",
  "Scoop Up Cyclone",
  "Unfair Stamp",
  "Hero's Cape",
  "Neutralization Zone",
  "Reboot Pod",
  "Survival Brace",
  "Legacy Energy",
  "Dangerous Laser",
  "Awakening Drum",
]);

/** Infer a basic-energy type from a card name ("Basic Fire Energy SVE 2",
 *  "Basic {D} Energy MEE 7", etc). Returns undefined for non-basics / special
 *  energies. */
function matrixEnergyType(name: string): string | undefined {
  const n = name.toLowerCase();
  for (const type of Object.keys(MATRIX_ENERGY_PALETTE)) {
    if (n.includes(type.toLowerCase())) return type;
  }
  const braceMap: Record<string, string> = {
    "{r}": "Fire", "{w}": "Water", "{g}": "Grass", "{l}": "Lightning",
    "{p}": "Psychic", "{f}": "Fighting", "{d}": "Darkness", "{m}": "Metal",
    "{n}": "Dragon", "{y}": "Fairy", "{c}": "Colorless",
  };
  for (const [brace, type] of Object.entries(braceMap)) {
    if (n.includes(brace)) return type;
  }
  return undefined;
}

interface MatrixSlot {
  kind: "pokemon" | "trainer" | "trainer-ace" | "energy-basic" | "energy-special" | "energy-ace" | "empty";
  energyType?: string;
  name?: string;
  subtypes?: string[];
}

function matrixLabel(slot: MatrixSlot): string {
  if (slot.kind === "pokemon") {
    const s = slot.subtypes ?? [];
    const mega = s.includes("Mega") ? "M" : "";
    if (s.includes("Stage 2")) return `${mega}2`;
    if (s.includes("Stage 1")) return `${mega}1`;
    return `${mega}B`;
  }
  if (slot.kind === "trainer-ace" || slot.kind === "energy-ace") return "A";
  if (slot.kind === "trainer") {
    const s = slot.subtypes ?? [];
    if (s.includes("Supporter")) return "SU";
    if (s.includes("Stadium")) return "ST";
    if (s.includes("Pokémon Tool")) return "T";
    return "I";
  }
  if (slot.kind === "energy-special") return "SE";
  if (slot.kind === "energy-basic") return "E";
  return "";
}

/** Returns true if the hex color is dark enough to warrant white text. */
function isDarkHex(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

/** Build a name → primary elemental type map from the analyze response's
 *  `pokemon.typesByName` field. Uses the first listed type when a Pokémon is
 *  dual-typed (rare in TCG) so the matrix has a single color per card. */
function pokemonPrimaryTypes(
  typesByName: Record<string, string[]> | undefined,
): Map<string, string> {
  const out = new Map<string, string>();
  if (!typesByName) return out;
  for (const [name, types] of Object.entries(typesByName)) {
    if (types && types.length > 0) out.set(name, types[0]);
  }
  return out;
}

/** Sort key for Pokémon stage: B < 1 < 2, then Mega variants (MB < M1 < M2). */
function pokemonStageOrder(subtypes: string[] | undefined): number {
  if (!subtypes) return 0;
  const mega = subtypes.includes("Mega");
  const base = subtypes.includes("Stage 2") ? 2 : subtypes.includes("Stage 1") ? 1 : 0;
  return mega ? base + 3 : base;
}

function buildMatrixSlots(
  cards: Array<{ qty: number; name: string; section: string }>,
  pokemonTypes: Map<string, string>,
  subtypesByName: Record<string, string[]>,
): MatrixSlot[] {
  const slots: MatrixSlot[] = [];

  // Pre-sort lookup keys by length descending so longer names
  // ("Marnie's Grimmsnarl ex") win over shorter ones ("Grimmsnarl").
  const sortedNames = Array.from(pokemonTypes.keys()).sort(
    (a, b) => b.length - a.length,
  );
  const lookupType = (cardName: string): string | undefined => {
    const lower = cardName.toLowerCase();
    for (const n of sortedNames) {
      if (lower.includes(n.toLowerCase())) return pokemonTypes.get(n);
    }
    return undefined;
  };

  // ── Pokémon: group by primary type, within each group sort by stage ──
  const pokemonCards = cards.filter((c) => c.section === "pokemon");
  // Bucket by type
  const byType = new Map<string, typeof pokemonCards>();
  for (const card of pokemonCards) {
    const type = lookupType(card.name) ?? "\xff"; // unknowns sort last
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(card);
  }
  // Sort type groups by total card count descending (primary type leads)
  const typeGroups = Array.from(byType.entries()).sort(
    (a, b) =>
      b[1].reduce((s, c) => s + c.qty, 0) -
      a[1].reduce((s, c) => s + c.qty, 0),
  );
  for (const [, group] of typeGroups) {
    // Within each type: sort by stage, then alphabetically as tiebreak
    const sorted = [...group].sort((a, b) => {
      const sd = pokemonStageOrder(subtypesByName[a.name]) - pokemonStageOrder(subtypesByName[b.name]);
      return sd !== 0 ? sd : a.name.localeCompare(b.name);
    });
    for (const card of sorted) {
      for (let i = 0; i < card.qty; i++) {
        slots.push({
          kind: "pokemon",
          energyType: lookupType(card.name),
          name: card.name,
          subtypes: subtypesByName[card.name],
        });
      }
    }
  }

  // ── Trainers: grouped by subtype, alphabetical within group, Ace Spec last ──
  const TRAINER_SUBTYPE_ORDER: Record<string, number> = {
    "Supporter": 0, "Item": 1, "Pokémon Tool": 2, "Stadium": 3,
  };
  const trainerSubtypeOrder = (name: string): number => {
    const s = subtypesByName[name] ?? [];
    for (const [subtype, order] of Object.entries(TRAINER_SUBTYPE_ORDER)) {
      if (s.includes(subtype)) return order;
    }
    return 1; // unknown defaults to Item
  };
  const trainerCards = cards.filter((c) => c.section === "trainer");
  const regularTrainers = trainerCards
    .filter((c) => !ACE_SPEC_NAMES.has(c.name))
    .sort((a, b) => {
      const sd = trainerSubtypeOrder(a.name) - trainerSubtypeOrder(b.name);
      return sd !== 0 ? sd : a.name.localeCompare(b.name);
    });
  const aceTrainers = trainerCards
    .filter((c) => ACE_SPEC_NAMES.has(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const card of [...regularTrainers, ...aceTrainers]) {
    for (let i = 0; i < card.qty; i++) {
      slots.push({
        kind: ACE_SPEC_NAMES.has(card.name) ? "trainer-ace" : "trainer",
        name: card.name,
        subtypes: subtypesByName[card.name],
      });
    }
  }

  // ── Energy: alphabetical ──
  const energyCards = [...cards.filter((c) => c.section === "energy")].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  for (const card of energyCards) {
    const isAce = ACE_SPEC_NAMES.has(card.name);
    const energyType = matrixEnergyType(card.name);
    const isBasic = /basic/i.test(card.name) || !!energyType;
    for (let i = 0; i < card.qty; i++) {
      slots.push({
        kind: isAce ? "energy-ace" : isBasic ? "energy-basic" : "energy-special",
        energyType,
        name: card.name,
        subtypes: subtypesByName[card.name],
      });
    }
  }

  while (slots.length < 60) slots.push({ kind: "empty" });
  return slots.slice(0, 60);
}

/** Convert a #RRGGBB hex to an rgba() string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function CollapsibleSection({
  title,
  children,
  badge,
  cardClass = "rounded-xl bg-white backdrop-blur-sm",
}: {
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  cardClass?: string;
}) {
  return (
    <details className={`${cardClass} p-5 group`}>
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

/** Legend row for the deck composition matrix — tiny sample tile + label + count. */
function LegendItem({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-text-primary tabular-nums w-[1.5ch] text-right inline-block">
        {count}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
        {label}
      </span>
    </div>
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

export interface DeckCreator {
  displayName: string;
  trainerTitle: string;
  badgeSlug: string;
  /** Tailwind text-color class for the tier. */
  tierColor: string;
}

interface Props {
  /**
   * Which variant of the deck profile this is. Controls logo visibility,
   * save/share button layout, and default footer CTA.
   *
   * - "fresh"  — freshly generated on home page; no logo (rendered above),
   *              save + share two-button row.
   * - "saved"  — viewing a saved deck (/my-decks/[id]); no logo,
   *              share button fills the full row (no save button).
   * - "shared" — public shared link (/d/[shortId]); logo shown,
   *              save + share two-button row.
   * - "meta"   — meta archetype page; no logo,
   *              save + share two-button row.
   */
  variant: "fresh" | "saved" | "shared" | "meta";
  deckList: string;
  /**
   * Optional sibling deck-list strings to render as a horizontal carousel
   * alongside the primary `deckList`. Currently only consumed by the meta
   * variant. The first entry should be `deckList` itself (or an equivalent).
   */
  deckLists?: string[];
  analysis: AnalysisResult;
  profiledAt: string;
  /** Page heading; defaults to "Deck Profile". */
  pageTitle?: string;
  /** Optional element rendered inline after the page heading (e.g. a pencil rename button). */
  titleAction?: React.ReactNode;
  /** Subtitle line below the heading; defaults to "Created on <date>". Accepts a ReactNode for custom content. */
  subtitle?: React.ReactNode;
  /**
   * Footer CTA content. Defaults to a "Profile your own deck" link.
   * Pass `null` to suppress the footer CTA entirely (e.g. meta deck pages
   * that don't need a "profile your own" nudge).
   */
  footerCta?: React.ReactNode | null;
  /** Optional creator info — shown as a badge card below the header. */
  creator?: DeckCreator;
  /**
   * Content injected above the price module.
   * Used by /my-decks/[id] to slot in the match log + notes,
   * and by /meta-decks/[slug] for stat cards + scouting note.
   */
  topSlot?: React.ReactNode;
  /**
   * Content injected immediately before the Overview matrix on all variants.
   * - saved: action buttons + match log
   * - meta: "#N in Standard" rank eyebrow
   * - fresh/shared: unused
   */
  preOverviewSlot?: React.ReactNode;
  /**
   * Content injected directly below the Save/Share button row.
   * Used by /meta-decks/[slug] to place the Scouting Note after the CTAs.
   */
  postCtaSlot?: React.ReactNode;
  /** Visual theme. "experiments" adopts the new design-identity styling. */
  theme?: "default" | "experiments";
}

/**
 * Full deck profile view. Used by both the public shared-deck page
 * (/d/[shortId]) and the private saved-deck view (/my-decks/[id]).
 *
 * Server component that embeds a handful of client islands (DeckPriceModule,
 * SaveDeckButton, StandardFormatInfo, ThemeColor, EnergyColor).
 */
export default function DeckProfileView({
  variant,
  deckList,
  deckLists,
  analysis,
  profiledAt,
  pageTitle = "Deck Profile",
  titleAction,
  subtitle,
  footerCta,
  creator,
  topSlot,
  preOverviewSlot,
  postCtaSlot,
  theme = "experiments",
}: Props) {
  const result = analysis;
  // Theme-aware class strings. Default preserves prod look verbatim;
  // "experiments" adopts the new design-identity treatment.
  const isExp = theme === "experiments";
  const CARD_CLS = isExp
    ? "rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm"
    : "rounded-xl bg-white backdrop-blur-sm";
  const TRACK_CLS = isExp ? "bg-black/5" : "bg-surface-2";
  const SUBCARD_CLS = isExp
    ? "border border-black/8 rounded-xl overflow-hidden"
    : "border border-border rounded-xl overflow-hidden";
  const SUBHEADER_CLS = isExp ? "bg-[#fafafa]" : "bg-surface-2";
  const dateStr = new Date(profiledAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const effectiveSubtitle = subtitle ?? `Created on ${dateStr}`;

  const defaultFooterCta = (
    <Link
      href="/"
      className={
        isExp
          ? "inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#D91E0D]/30 hover:shadow-[#D91E0D]/50 transition"
          : "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-light"
      }
    >
      Profile your own deck
    </Link>
  );

  const overviewNode = isExp ? (
    (() => {
      const pokemonTypes = pokemonPrimaryTypes(
        buildTypesByName(result.cards),
      );
      const subtypesByName = buildSubtypesByName(result.cards);
      const slots = buildMatrixSlots(result.cards, pokemonTypes, subtypesByName);
      const hasAce = slots.some(
        (s) => s.kind === "trainer-ace" || s.kind === "energy-ace",
      );
      // For the Pokémon legend tile: sample the deck's dominant
      // Pokémon type so the swatch reflects this specific build.
      const pokemonTypeCounts = new Map<string, number>();
      for (const s of slots) {
        if (s.kind === "pokemon" && s.energyType) {
          pokemonTypeCounts.set(
            s.energyType,
            (pokemonTypeCounts.get(s.energyType) ?? 0) + 1,
          );
        }
      }
      const dominantPokemonType = Array.from(
        pokemonTypeCounts.entries(),
      ).sort((a, b) => b[1] - a[1])[0]?.[0];
      const pokemonSwatch = dominantPokemonType
        ? MATRIX_ENERGY_PALETTE[dominantPokemonType]
        : MATRIX_ENERGY_PALETTE.Colorless;
      const renderSlot = (slot: MatrixSlot, i: number) => {
        const tile = "aspect-square rounded-[4px] flex items-center justify-center";
        const labelCls = "text-[10px] sm:text-sm font-semibold leading-none select-none";
        if (slot.kind === "empty") {
          return (
            <div
              key={i}
              className="aspect-square rounded-[4px] border-[2px] border-dashed border-black/15"
              title="Empty slot"
            />
          );
        }
        const label = matrixLabel(slot);
        if (slot.kind === "pokemon") {
          const baseColor = slot.energyType
            ? MATRIX_ENERGY_PALETTE[slot.energyType]
            : MATRIX_ENERGY_PALETTE.Colorless;
          const bg = hexToRgba(baseColor, 0.5);
          return (
            <div
              key={i}
              className={tile}
              style={{ background: bg }}
              title={
                slot.energyType
                  ? `${slot.name ?? "Pokémon"} (${slot.energyType})`
                  : slot.name ?? "Pokémon"
              }
            >
              <span className={labelCls} style={{ color: "rgba(0,0,0,0.55)" }}>
                {label}
              </span>
            </div>
          );
        }
        if (slot.kind === "trainer") {
          return (
            <div
              key={i}
              className={tile}
              style={{ background: "#E6E6E6" }}
              title={slot.name ?? "Trainer"}
            >
              <span className={labelCls} style={{ color: "rgba(0,0,0,0.55)" }}>
                {label}
              </span>
            </div>
          );
        }
        if (slot.kind === "trainer-ace" || slot.kind === "energy-ace") {
          return (
            <div
              key={i}
              className={tile}
              style={{ background: "#ED008C" }}
              title={`${slot.name ?? ""} (ACE SPEC)`}
            >
              <span className={labelCls} style={{ color: "rgba(255,255,255,0.9)" }}>
                {label}
              </span>
            </div>
          );
        }
        if (slot.kind === "energy-basic") {
          const color = slot.energyType
            ? MATRIX_ENERGY_PALETTE[slot.energyType]
            : MATRIX_ENERGY_PALETTE.Colorless;
          const textColor = isDarkHex(color)
            ? "rgba(255,255,255,0.9)"
            : "rgba(0,0,0,0.55)";
          return (
            <div
              key={i}
              className={tile}
              style={{ background: color }}
              title={`${slot.energyType ?? "Energy"}${slot.name ? ` — ${slot.name}` : ""}`}
            >
              <span className={labelCls} style={{ color: textColor }}>
                {label}
              </span>
            </div>
          );
        }
        // energy-special (non-ACE)
        return (
          <div
            key={i}
            className={tile}
            style={{ background: "linear-gradient(135deg,#C9C5BC 0%,#A8A8A8 100%)" }}
            title={slot.name ?? "Special Energy"}
          >
            <span className={labelCls} style={{ color: "rgba(0,0,0,0.55)" }}>
              {label}
            </span>
          </div>
        );
      };
      return (
        <div className={`${CARD_CLS} p-5`}>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-lg font-semibold">Overview</h2>
            {result.deckSize !== 60 && (
              <span className="text-sm font-mono tabular-nums text-[#D91E0D]">
                {result.deckSize} / 60
              </span>
            )}
          </div>

          <div
            className="grid grid-cols-12 gap-1.5 mb-5"
            aria-label="Deck composition matrix"
          >
            {slots.map(renderSlot)}
          </div>

          {/* Legend — supertype counts with a mini sample tile
              matching the matrix styling. */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-black/5 pt-4">
            <LegendItem label="Pokémon" count={result.sections.pokemon} />
            <LegendItem label="Trainer" count={result.sections.trainer} />
            <LegendItem label="Energy" count={result.sections.energy} />
            {hasAce && (
              <LegendItem
                label="ACE SPEC"
                count={slots.filter(
                  (s) => s.kind === "trainer-ace" || s.kind === "energy-ace",
                ).length}
              />
            )}
          </div>
        </div>
      );
    })()
  ) : (
    <div className={`${CARD_CLS} p-5`}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold">Overview</h2>
        <span className="text-xs text-text-muted">
          {result.deckSize} cards
        </span>
      </div>
      <div className={`flex h-1.5 rounded-full overflow-hidden ${TRACK_CLS} mb-4`}>
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
  );

  return (
    <div className="min-h-dvh flex flex-col bg-bg">

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className={`flex-shrink-0 px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] ${effectiveSubtitle ? "pb-8" : "pb-4"}`}
      >
        {variant === "shared" && (
          <div className="flex justify-center mb-4">
            <img
              src="/logo-light.png"
              alt="TCG Dexter"
              className="max-w-full"
              style={{ width: "288px", height: "auto" }}
            />
          </div>
        )}
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-gradient">
              {pageTitle}
            </h1>
            {titleAction}
          </div>
          {effectiveSubtitle && (
            <div className="mt-2 text-sm text-on-gradient-muted">
              {effectiveSubtitle}
            </div>
          )}
        </div>
      </header>

      {/* ── Results ────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">

          {/* Creator badge card */}
          {creator && (
            <div className={`flex items-center gap-3 ${CARD_CLS} px-4 py-3`}>
              <img
                src={`/badges/${creator.badgeSlug}.svg`}
                alt={creator.trainerTitle}
                className="w-10 h-10 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {creator.displayName}
                </p>
                <p className={`text-xs font-medium ${creator.tierColor}`}>
                  {creator.trainerTitle}
                </p>
              </div>
            </div>
          )}

          {/* ── Pre-overview slot: action buttons (saved), rank label (meta) ── */}
          {preOverviewSlot}

          {/* ── Overview — always at the top across all variants ── */}
          {overviewNode}

          {/* ── Top slot: deck notes + list (saved); stat cards + record (meta) ── */}
          {topSlot}

          {/* Estimated Deck Price */}
          <DeckPriceModule deckPrice={result.deckPrice} theme={theme} />

          {/* Save + Share buttons — layout depends on variant */}
          {variant === "saved" ? (
            /* Saved variant: share fills the full row; no save button */
            <ShareButton
              deckList={deckList}
              analysis={result}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#D91E0D]/30 hover:shadow-[#D91E0D]/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ) : (
            /* All other variants: Save (black) + Share side by side */
            <div className="flex gap-3">
              <SaveDeckButton
                deckList={deckList}
                analysis={result}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <ShareButton
                deckList={deckList}
                analysis={result}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#D91E0D]/30 hover:shadow-[#D91E0D]/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Post-CTA slot (meta variant uses this for the Scouting Note) */}
          {postCtaSlot}

          {/* Standard Format legality warning (only when not legal) */}
          {!result.rotation.ready && (
            <div
              className={
                isExp
                  ? `${CARD_CLS} px-5 py-4`
                  : "rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4"
              }
            >
              <div className="flex items-center gap-3 mb-3">
                <svg
                  className="w-4 h-4 text-amber-500 flex-shrink-0"
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
                    className={
                      isExp
                        ? "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-0.5 text-xs text-text-secondary"
                        : "inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-0.5 text-xs text-text-secondary"
                    }
                  >
                    <span className="font-semibold">{c.qty}</span>
                    <span>{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings — grouped here with the legality banner so all
              "things to fix" live together near the top. */}
          {result.warnings.length > 0 && (
            <div
              className={
                isExp
                  ? `${CARD_CLS} p-5`
                  : "rounded-xl border border-amber-600/30 bg-amber-50 p-4"
              }
            >
              <h3
                className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                  isExp ? "text-text-primary" : "text-amber-800"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${isExp ? "text-amber-600" : ""}`}
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
                  <li
                    key={i}
                    className={`text-sm ${isExp ? "text-text-secondary" : "text-amber-700"}`}
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}


          {/* Meta variant shows the live Deck List in this position so
              visitors see the actual sample list Limitless is showing. */}
          {variant === "meta" &&
            (deckLists && deckLists.length > 1 ? (
              <MetaDeckListCarousel deckLists={deckLists} />
            ) : (
              <DeckListCard deckList={deckList} />
            ))}

          {/* Pokemon */}
          <CollapsibleSection
            cardClass={CARD_CLS}
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
                          className={SUBCARD_CLS}
                        >
                          <div className={`${SUBHEADER_CLS} px-4 py-2`}>
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
                          className={SUBCARD_CLS}
                        >
                          <div className={`${SUBHEADER_CLS} px-4 py-2`}>
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
            cardClass={CARD_CLS}
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
                    className={SUBCARD_CLS}
                  >
                    <div className={`${SUBHEADER_CLS} px-4 py-2`}>
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
            cardClass={CARD_CLS}
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
                    className={SUBCARD_CLS}
                  >
                    <div className={`${SUBHEADER_CLS} px-4 py-2 flex items-center justify-between`}>
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
            <div
              className={
                isExp
                  ? "rounded-2xl p-[1.5px] bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] shadow-sm"
                  : ""
              }
            >
            <details
              className={
                isExp
                  ? "rounded-[14.5px] bg-white/95 backdrop-blur-xl p-5 group"
                  : "rounded-xl border border-[#d8b460]/40 bg-[#d8b460]/10 p-5 group"
              }
            >
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
                        className={
                          isExp
                            ? "flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-text-primary hover:border-[#D91E0D]/40 hover:text-[#D91E0D] transition-colors"
                            : "flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-[#d8b460]/50 bg-[#d8b460]/10 px-3 py-1 text-xs font-semibold text-[#d8b460] hover:bg-[#d8b460]/20 transition-colors"
                        }
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
            </div>
          )}

          {/* Footer CTA — null suppresses entirely, undefined uses default */}
          {footerCta !== null && (
            <div className="text-center mt-4">{footerCta ?? defaultFooterCta}</div>
          )}
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
