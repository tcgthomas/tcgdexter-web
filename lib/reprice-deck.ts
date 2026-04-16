/**
 * reprice-deck.ts — Re-calculate deck price and rotation status from the
 * latest bundled card data.
 *
 * Used by shared deck pages (/d/[shortId]) and saved deck pages to ensure
 * prices and rotation reflect current data rather than a frozen snapshot.
 */

import cardData from "@/data/cards-standard.json";

interface CardDataEntry {
  name: string;
  set_id: string;
  set_name: string;
  number: string;
  regulation_mark: string | null;
  market_price: number;
}

const CARD_DB = cardData as unknown as Record<string, CardDataEntry[]>;
const CARD_DB_LOWER = new Map(
  Object.entries(CARD_DB).map(([k, v]) => [k.toLowerCase(), v])
);

const ROTATING_MARKS = new Set(["A", "B", "C", "D", "E", "F", "G"]);

interface ParsedCard {
  qty: number;
  name: string;
}

/**
 * Parse a raw deck list string into card name + quantity pairs.
 * Handles the standard PTCGO export format.
 */
function parseDeckList(deckList: string): ParsedCard[] {
  const cards: ParsedCard[] = [];
  for (const line of deckList.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip section headers like "Pokémon: 20" or "Trainer: 25"
    if (/^(pok[ée]mon|trainer|energy)\s*:/i.test(trimmed)) continue;
    // Match "4 Pikachu SVI 56" or "4 Pikachu ex SVI 56"
    const match = trimmed.match(/^(\d+)\s+(.+?)\s+[A-Z]{2,5}\s+\d+/);
    if (match) {
      cards.push({ qty: parseInt(match[1], 10), name: match[2].trim() });
    }
  }
  return cards;
}

export interface RepriceResult {
  deckPrice: number;
  rotation: {
    ready: boolean;
    rotatingCount: number;
    rotatingCards: Array<{ name: string; qty: number }>;
  };
}

/**
 * Re-price a deck list using the latest bundled card data.
 * Returns updated deckPrice and rotation status.
 */
export function repriceDeck(deckList: string): RepriceResult {
  const cards = parseDeckList(deckList);

  let totalPrice = 0;
  const rotatingCards: Array<{ name: string; qty: number }> = [];

  for (const card of cards) {
    const entries = CARD_DB_LOWER.get(card.name.toLowerCase());
    if (!entries || entries.length === 0) continue;

    // Use the first entry's price (same logic as /api/analyze)
    const entry = entries[0];
    if (entry.market_price > 0) {
      totalPrice += entry.market_price * card.qty;
    }

    // Check rotation
    const mark = entry.regulation_mark;
    if (mark && ROTATING_MARKS.has(mark.toUpperCase())) {
      rotatingCards.push({ name: card.name, qty: card.qty });
    }
  }

  const rotatingCount = rotatingCards.reduce((s, c) => s + c.qty, 0);

  return {
    deckPrice: Math.round(totalPrice * 100) / 100,
    rotation: {
      ready: rotatingCount === 0,
      rotatingCount,
      rotatingCards,
    },
  };
}
