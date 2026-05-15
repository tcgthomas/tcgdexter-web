import cardData from "@/data/cards-standard.json";

interface AnalysisCard {
  qty: number;
  name: string;
  number: string;
  setCode: string;
  section: "pokemon" | "trainer" | "energy";
}

interface CardEntry {
  set_id: string;
  ptcgo_code?: string;
  number: string;
  subtypes: string[];
}

const CARD_DB = cardData as unknown as Record<string, CardEntry[]>;
const CARD_DB_LOWER = new Map(
  Object.entries(CARD_DB).map(([k, v]) => [k.toLowerCase(), v as CardEntry[]])
);

const SUBTYPE_RANK: Record<string, number> = {
  "Stage 2": 6,
  VMAX: 5,
  VSTAR: 5,
  ex: 4,
  EX: 4,
  GX: 4,
  "TAG TEAM": 4,
  V: 3,
  "Stage 1": 2,
  Basic: 1,
};

function stageRank(subtypes: string[]): number {
  return subtypes.reduce((max, s) => Math.max(max, SUBTYPE_RANK[s] ?? 0), 0);
}

/**
 * Given a saved deck's analysis.cards list, returns the pokemontcg.io image
 * URL for the most prominent Pokémon: highest stage first, then highest copy
 * count. Returns null when the list is empty or no set_id can be resolved.
 */
export function primaryCardImageUrl(cards: AnalysisCard[]): string | null {
  const pokemon = cards.filter((c) => c.section === "pokemon");
  if (!pokemon.length) return null;

  const annotated = pokemon.map((card) => {
    const entries =
      CARD_DB[card.name] ??
      CARD_DB_LOWER.get(card.name.toLowerCase()) ??
      [];

    // Prefer exact ptcgo_code + number match, then number-only, then first entry
    const match =
      entries.find((e) => e.ptcgo_code === card.setCode && e.number === card.number) ??
      entries.find((e) => e.number === card.number) ??
      entries[0] ??
      null;

    return {
      card,
      set_id: match?.set_id ?? null,
      rank: match ? stageRank(match.subtypes) : 0,
    };
  });

  // Highest stage first; break ties by copy count
  annotated.sort((a, b) => b.rank - a.rank || b.card.qty - a.card.qty);

  const best = annotated[0];
  if (!best?.set_id) return null;
  return `https://images.pokemontcg.io/${best.set_id}/${best.card.number}.png`;
}
