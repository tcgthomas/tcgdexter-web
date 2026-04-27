/**
 * Pure utilities for building the deck composition matrix — the 12×5 grid of
 * 60 colored tiles that summarizes a deck on profile pages.
 *
 * Kept React-free so it can be consumed both by the JSX renderer in
 * `DeckProfileView` and by the edge-runtime OG image at
 * `app/d/[shortId]/opengraph-image.tsx`.
 */

/**
 * Palette for basic-energy-typed squares in the composition matrix.
 * Standalone from elemental energy chips elsewhere in the app so we can tune
 * the matrix look without rippling changes through every energy chip.
 */
export const MATRIX_ENERGY_PALETTE: Record<string, string> = {
  Fire:      "#F1554B",
  Water:     "#3BBBE7",
  Grass:     "#57B060",
  Lightning: "#F3DC67",
  Psychic:   "#AC84A7",
  Fighting:  "#DF8524",
  Darkness:  "#318C98",
  Colorless: "#E8EDEC",
  Metal:     "#A8A8A8",
  Dragon:    "#D4A93A",
  Fairy:     "#E879A3",
};

/** Known ACE SPEC Trainer / Special Energy card names in Standard rotation.
 *  Extend as the list grows. Used to color-flag the square pink in the
 *  composition matrix. */
export const ACE_SPEC_NAMES = new Set<string>([
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

export interface MatrixSlot {
  kind:
    | "pokemon"
    | "trainer"
    | "trainer-ace"
    | "energy-basic"
    | "energy-special"
    | "energy-ace"
    | "empty";
  energyType?: string;
  name?: string;
  subtypes?: string[];
}

/** Infer a basic-energy type from a card name ("Basic Fire Energy SVE 2",
 *  "Basic {D} Energy MEE 7", etc). Returns undefined for non-basics / special
 *  energies. */
export function matrixEnergyType(name: string): string | undefined {
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

export function matrixLabel(slot: MatrixSlot): string {
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
export function isDarkHex(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

/** Convert a #RRGGBB hex to an rgba() string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Build a name → primary elemental type map. Uses the first listed type when
 *  a Pokémon is dual-typed (rare in TCG) so the matrix has a single color
 *  per card. */
export function pokemonPrimaryTypes(
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

export function buildMatrixSlots(
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
  const byType = new Map<string, typeof pokemonCards>();
  for (const card of pokemonCards) {
    const type = lookupType(card.name) ?? "\xff"; // unknowns sort last
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(card);
  }
  const typeGroups = Array.from(byType.entries()).sort(
    (a, b) =>
      b[1].reduce((s, c) => s + c.qty, 0) -
      a[1].reduce((s, c) => s + c.qty, 0),
  );
  for (const [, group] of typeGroups) {
    const sorted = [...group].sort((a, b) => {
      const sd =
        pokemonStageOrder(subtypesByName[a.name]) -
        pokemonStageOrder(subtypesByName[b.name]);
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
