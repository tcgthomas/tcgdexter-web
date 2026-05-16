import { getAllCards, getSets, type CardIndexEntry } from "@/lib/cardsIndex";

export type SortKey = "name" | "number" | "hp" | "price";
export type SortDir = "asc" | "desc";

export interface CardSearchParams {
  q?: string;
  supertype?: string[];
  type?: string[];
  subtype?: string[];
  regulation?: string[];
  setId?: string[];
  hpMin?: number;
  hpMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: SortKey;
  dir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface CardSearchResult {
  cards: CardIndexEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function parseQueryTokens(q: string): { numeric: string[]; setCodes: Set<string>; words: string[] } {
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const knownCodes = new Set(
    getSets()
      .map((s) => s.ptcgoCode?.toLowerCase())
      .filter((c): c is string => !!c)
  );
  const numeric: string[] = [];
  const setCodes = new Set<string>();
  const words: string[] = [];
  for (const t of tokens) {
    if (/^\d+(\/\d+)?$/.test(t)) {
      numeric.push(t.split("/")[0]);
    } else if (knownCodes.has(t)) {
      setCodes.add(t);
    } else {
      words.push(t);
    }
  }
  return { numeric, setCodes, words };
}

interface ScoredCard {
  card: CardIndexEntry;
  score: number;
}

function matchAndScore(
  card: CardIndexEntry,
  query: ReturnType<typeof parseQueryTokens>
): number | null {
  let score = 0;

  if (query.setCodes.size > 0) {
    const code = card.ptcgoCode?.toLowerCase();
    if (!code || !query.setCodes.has(code)) return null;
    score += 5;
  }

  if (query.numeric.length > 0) {
    for (const n of query.numeric) {
      const padded = n.padStart(3, "0");
      if (card.number === n || card.numberPadded === padded) {
        score += 20;
      } else if (card.number.startsWith(n) || card.numberPadded.startsWith(padded)) {
        score += 8;
      } else {
        return null;
      }
    }
  }

  if (query.words.length > 0) {
    for (const w of query.words) {
      let tokenScore = 0;
      if (card.nameLower === w) {
        tokenScore = 50;
      } else if (card.nameLower.startsWith(w)) {
        tokenScore = 30;
      } else if (card.nameTokens.some((tok) => tok === w)) {
        tokenScore = 25;
      } else if (card.nameTokens.some((tok) => tok.startsWith(w))) {
        tokenScore = 15;
      } else if (card.nameLower.includes(w)) {
        tokenScore = 5;
      } else {
        return null;
      }
      score += tokenScore;
    }
  }

  return score;
}

function applyFilters(card: CardIndexEntry, p: CardSearchParams): boolean {
  if (p.supertype?.length && !p.supertype.includes(card.supertype)) return false;
  if (p.type?.length && !card.types.some((t) => p.type!.includes(t))) return false;
  if (p.subtype?.length && !card.subtypes.some((s) => p.subtype!.includes(s))) return false;
  if (p.regulation?.length) {
    if (!card.regulationMark || !p.regulation.includes(card.regulationMark)) return false;
  }
  if (p.setId?.length && !p.setId.includes(card.setId)) return false;
  if (p.hpMin != null && (card.hp == null || card.hp < p.hpMin)) return false;
  if (p.hpMax != null && (card.hp == null || card.hp > p.hpMax)) return false;
  if (p.priceMin != null && card.marketPrice < p.priceMin) return false;
  if (p.priceMax != null && card.marketPrice > p.priceMax) return false;
  return true;
}

function compareCards(a: CardIndexEntry, b: CardIndexEntry, sort: SortKey, dir: SortDir): number {
  const mult = dir === "desc" ? -1 : 1;
  switch (sort) {
    case "hp":
      return mult * ((a.hp ?? -1) - (b.hp ?? -1)) || a.name.localeCompare(b.name);
    case "price":
      return mult * (a.marketPrice - b.marketPrice) || a.name.localeCompare(b.name);
    case "number":
      return (
        mult *
          ((a.numberNumeric ?? Number.MAX_SAFE_INTEGER) -
            (b.numberNumeric ?? Number.MAX_SAFE_INTEGER)) ||
        a.setName.localeCompare(b.setName)
      );
    case "name":
    default:
      return mult * a.name.localeCompare(b.name) || a.setName.localeCompare(b.setName);
  }
}

export function searchCards(params: CardSearchParams): CardSearchResult {
  const all = getAllCards();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(240, Math.max(12, params.pageSize ?? 120));
  const sort: SortKey = params.sort ?? "name";
  const dir: SortDir = params.dir ?? "asc";
  const q = params.q?.trim();

  let filtered: ScoredCard[];

  if (q) {
    const tokens = parseQueryTokens(q);
    if (tokens.numeric.length === 0 && tokens.setCodes.size === 0 && tokens.words.length === 0) {
      filtered = all.filter((c) => applyFilters(c, params)).map((c) => ({ card: c, score: 0 }));
    } else {
      filtered = [];
      for (const c of all) {
        if (!applyFilters(c, params)) continue;
        const s = matchAndScore(c, tokens);
        if (s == null) continue;
        filtered.push({ card: c, score: s });
      }
      filtered.sort((a, b) => b.score - a.score || compareCards(a.card, b.card, sort, dir));
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      return {
        cards: filtered.slice(start, start + pageSize).map((s) => s.card),
        total,
        page,
        pageSize,
      };
    }
  } else {
    filtered = all.filter((c) => applyFilters(c, params)).map((c) => ({ card: c, score: 0 }));
  }

  filtered.sort((a, b) => compareCards(a.card, b.card, sort, dir));
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    cards: filtered.slice(start, start + pageSize).map((s) => s.card),
    total,
    page,
    pageSize,
  };
}

export function getFilterFacets() {
  const cards = getAllCards();
  const supertypes = new Set<string>();
  const types = new Set<string>();
  const subtypes = new Set<string>();
  const regulations = new Set<string>();
  for (const c of cards) {
    supertypes.add(c.supertype);
    c.types.forEach((t) => types.add(t));
    c.subtypes.forEach((s) => subtypes.add(s));
    if (c.regulationMark) regulations.add(c.regulationMark);
  }
  return {
    supertypes: Array.from(supertypes).sort(),
    types: Array.from(types).sort(),
    subtypes: Array.from(subtypes).sort(),
    regulations: Array.from(regulations).sort(),
    sets: getSets(),
  };
}
