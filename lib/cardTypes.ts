import cardData from "@/data/cards-standard.json";

interface CardDataEntry {
  name: string;
  types?: string[];
}

const CARD_DB = cardData as unknown as Record<string, CardDataEntry[]>;
const CARD_DB_LOWER = new Map(
  Object.entries(CARD_DB).map(([k, v]) => [k.toLowerCase(), v]),
);

export function buildTypesByName(
  cards: Array<{ name: string; section: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const card of cards) {
    if (card.section !== "pokemon") continue;
    if (seen.has(card.name)) continue;
    seen.add(card.name);
    const entry = CARD_DB_LOWER.get(card.name.toLowerCase())?.[0];
    if (entry?.types && entry.types.length > 0) {
      out[card.name] = entry.types;
    }
  }
  return out;
}
