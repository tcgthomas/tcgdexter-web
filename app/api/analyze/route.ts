import { NextRequest, NextResponse } from "next/server";

const DAEMON_URL = "http://100.80.110.45:8789";

/* ─── Types ──────────────────────────────────────────────────── */

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
    abilities: PokemonAbility[];
    attacks: PokemonAttack[];
  };
  metaMatch: {
    matched: boolean;
    archetypeName: string | null;
    matchPct: number | null;
  };
  cards: Card[];
  warnings: string[];
}

interface DaemonCard {
  name?: string;
  attacks?: string | RawAttack[];
  abilities?: string | RawAbility[];
}

interface RawAttack {
  name: string;
  cost?: string[];
  damage?: string;
  text?: string;
  convertedEnergyCost?: number;
}

interface RawAbility {
  name: string;
  text?: string;
  type?: string;
}

interface MetaArchetype {
  id?: string | number;
  name: string;
  representation_pct: number;
  top_cut_entries?: number;
}

/* ─── Parser ─────────────────────────────────────────────────── */

function parseDeckList(raw: string): Card[] {
  const lines = raw.split("\n").map((l) => l.trim());
  const cards: Card[] = [];
  let currentSection: Card["section"] | null = null;

  for (const line of lines) {
    if (!line) continue;

    const headerMatch = line.match(/^(Pok[eé]mon|Trainer|Energy)\s*:/i);
    if (headerMatch) {
      const h = headerMatch[1].toLowerCase();
      if (h.startsWith("pok")) currentSection = "pokemon";
      else if (h === "trainer") currentSection = "trainer";
      else currentSection = "energy";
      continue;
    }

    if (/^total\s+cards?\s*:/i.test(line)) continue;

    const cardMatch = line.match(/^(\d+)\s+(.+?)\s+[A-Z0-9-]{2,10}\s+\d+$/);
    if (cardMatch && currentSection) {
      cards.push({
        qty: parseInt(cardMatch[1], 10),
        name: cardMatch[2],
        section: currentSection,
      });
      continue;
    }

    const simpleMatch = line.match(/^(\d+)\s+(.+)$/);
    if (simpleMatch && currentSection) {
      cards.push({
        qty: parseInt(simpleMatch[1], 10),
        name: simpleMatch[2].trim(),
        section: currentSection,
      });
    }
  }

  return cards;
}

/* ─── JSON field parser ──────────────────────────────────────── */

function parseJSONField<T>(value: string | T[] | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ─── Archetype Detection ────────────────────────────────────── */

interface ArchetypeRule {
  required: string[];
  optional?: string[];
  name: string;
}

const ARCHETYPE_RULES: ArchetypeRule[] = [
  { required: ["Charizard ex"], optional: ["Pidgeot ex"], name: "Charizard ex" },
  { required: ["Dragapult ex", "Dusknoir"], name: "Dragapult ex / Dusknoir" },
  { required: ["Regidrago VSTAR"], name: "Regidrago VSTAR" },
  { required: ["Gardevoir ex"], optional: ["Drifloon"], name: "Gardevoir ex" },
  { required: ["Lugia VSTAR"], optional: ["Archeops"], name: "Lugia VSTAR / Archeops" },
  { required: ["Snorlax"], optional: ["Rotom V"], name: "Snorlax Stall" },
  { required: ["Raging Bolt ex"], optional: ["Ogerpon ex"], name: "Raging Bolt ex" },
  { required: ["Terapagos ex"], name: "Terapagos ex" },
  { required: ["Miraidon ex"], name: "Miraidon ex" },
  { required: ["Palkia VSTAR"], name: "Palkia VSTAR" },
  { required: ["Chien-Pao ex"], optional: ["Baxcalibur"], name: "Chien-Pao ex / Baxcalibur" },
  { required: ["Marnie's Grimmsnarl ex", "Froslass"], name: "Grimmsnarl ex / Froslass" },
  { required: ["Lost Zone", "Comfey"], name: "Lost Zone Box" },
];

function detectArchetypeName(cards: Card[]): string | null {
  const names = cards.map((c) => c.name.toLowerCase());
  const hasCard = (name: string) => {
    const lower = name.toLowerCase();
    return names.some((n) => n === lower || n.includes(lower));
  };

  const sorted = [...ARCHETYPE_RULES].sort(
    (a, b) => b.required.length - a.required.length
  );

  for (const rule of sorted) {
    if (rule.required.every((r) => hasCard(r))) {
      return rule.name;
    }
  }

  return null;
}

/* ─── Daemon Fetches ─────────────────────────────────────────── */

async function fetchCardFromDaemon(name: string): Promise<DaemonCard | null> {
  try {
    const url = `${DAEMON_URL}/v1/cards?q=${encodeURIComponent(name)}&limit=3`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const cards: DaemonCard[] = Array.isArray(data)
      ? data
      : (data.data ?? data.cards ?? data.results ?? []);
    if (!cards.length) return null;
    const exact = cards.find(
      (c) => c.name?.toLowerCase() === name.toLowerCase()
    );
    return exact ?? cards[0];
  } catch {
    return null;
  }
}

async function fetchMetaArchetypes(): Promise<MetaArchetype[]> {
  try {
    const res = await fetch(`${DAEMON_URL}/v1/meta/archetypes`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const list: MetaArchetype[] = Array.isArray(data)
      ? data
      : (data.data ?? data.archetypes ?? data.results ?? []);
    return list
      .sort((a, b) => b.representation_pct - a.representation_pct)
      .slice(0, 20);
  } catch {
    return [];
  }
}

/* ─── Route Handler ──────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const { deckList } = (await req.json()) as { deckList?: string };

    if (!deckList || typeof deckList !== "string" || !deckList.trim()) {
      return NextResponse.json(
        { error: "Deck list is required." },
        { status: 400 }
      );
    }

    const cards = parseDeckList(deckList);

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "Could not parse any cards. Check your deck list format." },
        { status: 400 }
      );
    }

    const pokemonCount = cards
      .filter((c) => c.section === "pokemon")
      .reduce((s, c) => s + c.qty, 0);
    const trainerCount = cards
      .filter((c) => c.section === "trainer")
      .reduce((s, c) => s + c.qty, 0);
    const energyCount = cards
      .filter((c) => c.section === "energy")
      .reduce((s, c) => s + c.qty, 0);
    const deckSize = pokemonCount + trainerCount + energyCount;

    const sections = {
      pokemon: pokemonCount,
      trainer: trainerCount,
      energy: energyCount,
      pokemonRatio: deckSize > 0 ? `${Math.round((pokemonCount / deckSize) * 100)}%` : "0%",
      trainerRatio: deckSize > 0 ? `${Math.round((trainerCount / deckSize) * 100)}%` : "0%",
      energyRatio: deckSize > 0 ? `${Math.round((energyCount / deckSize) * 100)}%` : "0%",
    };

    // Warnings — deck size only
    const warnings: string[] = [];
    if (deckSize !== 60) {
      warnings.push(`Deck has ${deckSize} cards — standard format requires exactly 60.`);
    }

    // ── Pokémon Breakdown ──────────────────────────────────────
    const pokemonCards = cards.filter((c) => c.section === "pokemon");
    const uniquePokemonNames = Array.from(new Set(pokemonCards.map((c) => c.name)));
    const totalPokemonCards = pokemonCards.reduce((s, c) => s + c.qty, 0);

    // Fetch meta archetypes + all pokemon cards in parallel
    const [metaArchetypes, ...pokemonFetchResults] = await Promise.all([
      fetchMetaArchetypes(),
      ...uniquePokemonNames.map((name) => fetchCardFromDaemon(name)),
    ]);

    const abilities: PokemonAbility[] = [];
    const attacks: PokemonAttack[] = [];

    uniquePokemonNames.forEach((pokemonName, i) => {
      const daemonCard = pokemonFetchResults[i];
      if (!daemonCard) return;

      const rawAbilities = parseJSONField<RawAbility>(daemonCard.abilities);
      for (const ab of rawAbilities) {
        if (ab.name) {
          abilities.push({
            pokemonName,
            abilityName: ab.name,
            description: ab.text ?? "",
          });
        }
      }

      const rawAttacks = parseJSONField<RawAttack>(daemonCard.attacks);
      for (const atk of rawAttacks) {
        if (atk.name) {
          attacks.push({
            pokemonName,
            attackName: atk.name,
            cost: atk.cost ?? [],
            damage: atk.damage ?? "",
            description: atk.text ?? "",
          });
        }
      }
    });

    // ── Meta Match ─────────────────────────────────────────────
    const archetypeName = detectArchetypeName(cards);
    let metaMatch: AnalysisResult["metaMatch"] = {
      matched: false,
      archetypeName: null,
      matchPct: null,
    };

    if (archetypeName) {
      const archLower = archetypeName.toLowerCase();
      const metaEntry = metaArchetypes.find((m) =>
        m.name.toLowerCase().includes(archLower) ||
        archLower.includes(m.name.toLowerCase())
      );
      if (metaEntry) {
        metaMatch = {
          matched: true,
          archetypeName,
          matchPct: metaEntry.representation_pct,
        };
      }
    }

    const result: AnalysisResult = {
      deckSize,
      sections,
      pokemon: {
        totalCards: totalPokemonCards,
        uniqueSpecies: uniquePokemonNames.length,
        abilities,
        attacks,
      },
      metaMatch,
      cards,
      warnings,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze deck list." },
      { status: 500 }
    );
  }
}
