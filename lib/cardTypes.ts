import cardTypeData from "@/data/card-types.json";

interface CardTypeEntry {
  types?: string[];
  subtypes?: string[];
}

/**
 * Slim lookup keyed by card name. Derived from `cards-standard.json` via
 * `scripts/build_card_types.mjs` — keeps the bundle small enough for edge
 * runtime consumers (e.g. the OG image route).
 */
const CARD_TYPE_DB = cardTypeData as unknown as Record<string, CardTypeEntry>;
const CARD_TYPE_DB_LOWER = new Map(
  Object.entries(CARD_TYPE_DB).map(([k, v]) => [k.toLowerCase(), v]),
);

export function buildSubtypesByName(
  cards: Array<{ name: string; section: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card.name)) continue;
    seen.add(card.name);
    const entry = CARD_TYPE_DB_LOWER.get(card.name.toLowerCase());
    if (entry?.subtypes && entry.subtypes.length > 0) {
      out[card.name] = entry.subtypes;
    }
  }
  return out;
}

export function buildTypesByName(
  cards: Array<{ name: string; section: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const card of cards) {
    if (card.section !== "pokemon") continue;
    if (seen.has(card.name)) continue;
    seen.add(card.name);
    const entry = CARD_TYPE_DB_LOWER.get(card.name.toLowerCase());
    if (entry?.types && entry.types.length > 0) {
      out[card.name] = entry.types;
    }
  }
  return out;
}
