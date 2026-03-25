import { NextRequest, NextResponse } from "next/server";

/* ─── Types ──────────────────────────────────────────────────── */

interface Card {
  qty: number;
  name: string;
  section: "pokemon" | "trainer" | "energy";
}

interface EnergyProfile {
  primaryType: string | null;
  types: Record<string, number>;
  specialEnergy: string[];
  totalBasic: number;
  totalSpecial: number;
}

interface Archetype {
  name: string;
  strategy: string;
  tier: number;
}

interface ConsistencyMetrics {
  drawSupporters: { name: string; qty: number }[];
  searchCards: { name: string; qty: number }[];
  totalDraw: number;
  totalSearch: number;
  rating: string;
}

interface AnalysisResult {
  deckSize: number;
  sections: { pokemon: number; trainer: number; energy: number };
  cards: Card[];
  energyProfile: EnergyProfile;
  archetype: Archetype | null;
  consistency: ConsistencyMetrics;
  warnings: string[];
}

/* ─── Parser ─────────────────────────────────────────────────── */

function parseDeckList(raw: string): Card[] {
  const lines = raw.split("\n").map((l) => l.trim());
  const cards: Card[] = [];
  let currentSection: Card["section"] | null = null;

  for (const line of lines) {
    // Skip blank lines
    if (!line) continue;

    // Detect section headers
    const headerMatch = line.match(/^(Pok[eé]mon|Trainer|Energy)\s*:/i);
    if (headerMatch) {
      const h = headerMatch[1].toLowerCase();
      if (h.startsWith("pok")) currentSection = "pokemon";
      else if (h === "trainer") currentSection = "trainer";
      else currentSection = "energy";
      continue;
    }

    // Skip "Total Cards" line
    if (/^total\s+cards?\s*:/i.test(line)) continue;

    // Parse card line: {qty} {name} {set} {number}
    // Qty is the first token, set is the second-to-last, number is the last
    const cardMatch = line.match(/^(\d+)\s+(.+?)\s+[A-Z0-9-]{2,10}\s+\d+$/);
    if (cardMatch && currentSection) {
      cards.push({
        qty: parseInt(cardMatch[1], 10),
        name: cardMatch[2],
        section: currentSection,
      });
      continue;
    }

    // Fallback: try simpler format {qty} {name} (no set/number)
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

/* ─── Energy Profile ─────────────────────────────────────────── */

const BASIC_ENERGY_MAP: Record<string, string> = {
  fire: "Fire",
  water: "Water",
  grass: "Grass",
  lightning: "Lightning",
  psychic: "Psychic",
  fighting: "Fighting",
  darkness: "Darkness",
  dark: "Darkness",
  metal: "Metal",
  fairy: "Fairy",
  dragon: "Dragon",
  colorless: "Colorless",
};

const SPECIAL_ENERGY_NAMES = [
  "Double Turbo Energy",
  "Jet Energy",
  "Luminous Energy",
  "Reversal Energy",
  "Therapeutic Energy",
  "Gift Energy",
  "Neo Upper Energy",
  "Legacy Energy",
  "Mist Energy",
  "V Guard Energy",
  "Regenerative Energy",
  "Super Rod Energy",
];

function analyzeEnergy(cards: Card[]): EnergyProfile {
  const energyCards = cards.filter((c) => c.section === "energy");
  const types: Record<string, number> = {};
  const specialEnergy: string[] = [];
  let totalBasic = 0;
  let totalSpecial = 0;

  for (const card of energyCards) {
    // Check if special energy
    const isSpecial = SPECIAL_ENERGY_NAMES.some((se) =>
      card.name.toLowerCase().includes(se.toLowerCase())
    );

    if (isSpecial) {
      specialEnergy.push(card.name);
      totalSpecial += card.qty;
      continue;
    }

    // Match basic energy by name
    const nameLower = card.name.toLowerCase();
    let matched = false;
    for (const [keyword, typeName] of Object.entries(BASIC_ENERGY_MAP)) {
      if (nameLower.includes(keyword)) {
        types[typeName] = (types[typeName] || 0) + card.qty;
        totalBasic += card.qty;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Unknown energy — still count it
      types[card.name] = (types[card.name] || 0) + card.qty;
      totalBasic += card.qty;
    }
  }

  // Find primary type
  let primaryType: string | null = null;
  let maxCount = 0;
  for (const [type, count] of Object.entries(types)) {
    if (count > maxCount) {
      maxCount = count;
      primaryType = type;
    }
  }

  return { primaryType, types, specialEnergy, totalBasic, totalSpecial };
}

/* ─── Archetype Detection ────────────────────────────────────── */

interface ArchetypeRule {
  required: string[];
  optional?: string[];
  result: Archetype;
}

const ARCHETYPE_RULES: ArchetypeRule[] = [
  {
    required: ["Charizard ex"],
    optional: ["Pidgeot ex"],
    result: {
      name: "Charizard ex",
      strategy:
        "Discard-and-accelerate fire aggro. Dominated the meta for two years — fast, explosive, high damage ceiling.",
      tier: 1,
    },
  },
  {
    required: ["Dragapult ex", "Dusknoir"],
    result: {
      name: "Dragapult ex / Dusknoir",
      strategy:
        "Spread damage counters with Dusknoir, close out with Dragapult's high burst. Control-aggro hybrid.",
      tier: 1,
    },
  },
  {
    required: ["Regidrago VSTAR"],
    result: {
      name: "Regidrago VSTAR",
      strategy:
        "Copy attacks from Dragon Pokémon in the discard. Extremely flexible — adapts to any matchup with the right discard setup.",
      tier: 1,
    },
  },
  {
    required: ["Gardevoir ex"],
    optional: ["Drifloon"],
    result: {
      name: "Gardevoir ex",
      strategy:
        "Psychic energy acceleration from the discard pile. Strong draw engine with Kirlia's Refinement. Scales damage in the late game.",
      tier: 1,
    },
  },
  {
    required: ["Lugia VSTAR"],
    optional: ["Archeops"],
    result: {
      name: "Lugia VSTAR / Archeops",
      strategy:
        "Summon Archeops from the discard with Lugia's VSTAR Power, then accelerate special energy to power up any attacker. Toolbox-style deck.",
      tier: 2,
    },
  },
  {
    required: ["Snorlax"],
    optional: ["Rotom V"],
    result: {
      name: "Snorlax Stall",
      strategy:
        "Block the active slot with Snorlax, disrupt the opponent's resources, and win by decking them out. Pure control.",
      tier: 2,
    },
  },
  {
    required: ["Raging Bolt ex"],
    optional: ["Ogerpon ex"],
    result: {
      name: "Raging Bolt ex",
      strategy:
        "Stack Lightning energy on Raging Bolt for massive damage. Ogerpon provides energy acceleration. Simple but explosive.",
      tier: 1,
    },
  },
  {
    required: ["Terapagos ex"],
    result: {
      name: "Terapagos ex",
      strategy:
        "Flexible Colorless attacker that copies attacks. Pairs with various support Pokémon for a toolbox approach.",
      tier: 2,
    },
  },
  {
    required: ["Miraidon ex"],
    result: {
      name: "Miraidon ex",
      strategy:
        "Fast Lightning aggro — Miraidon fills the bench with Electric-types and accelerates energy. Aims to take quick prizes.",
      tier: 2,
    },
  },
  {
    required: ["Palkia VSTAR"],
    result: {
      name: "Palkia VSTAR",
      strategy:
        "Water-based tempo deck that scales damage with bench size. Star Portal VSTAR Power provides mid-game energy recovery.",
      tier: 2,
    },
  },
  {
    required: ["Chien-Pao ex"],
    optional: ["Baxcalibur"],
    result: {
      name: "Chien-Pao ex / Baxcalibur",
      strategy:
        "Baxcalibur accelerates Water energy each turn. Chien-Pao hits for huge numbers based on total energy in play.",
      tier: 2,
    },
  },
  {
    required: ["Lost Zone", "Comfey"],
    result: {
      name: "Lost Zone Box",
      strategy:
        "Engine built around Comfey's Flower Selecting to fill the Lost Zone, unlocking powerful attacks and abilities from Mirage Gate and friends.",
      tier: 2,
    },
  },
];

function detectArchetype(cards: Card[]): Archetype | null {
  const names = cards.map((c) => c.name.toLowerCase());
  const hasCard = (name: string) => {
    const lower = name.toLowerCase();
    return names.some((n) => n === lower || n.includes(lower));
  };

  // Check rules in order (more specific first — multi-card requirements)
  const sorted = [...ARCHETYPE_RULES].sort(
    (a, b) => b.required.length - a.required.length
  );

  for (const rule of sorted) {
    const allRequired = rule.required.every((r) => hasCard(r));
    if (allRequired) {
      return rule.result;
    }
  }

  return null;
}

/* ─── Consistency Metrics ────────────────────────────────────── */

const DRAW_SUPPORTERS = [
  "Professor's Research",
  "Professor Turo's Scenario",
  "Professor Sada's Vitality",
  "Iono",
  "Judge",
  "N",
  "Cynthia",
  "Colress",
  "Bibarel",
  "Ciphermaniac's Codebreaking",
];

const SEARCH_CARDS = [
  "Arven",
  "Irida",
  "Nest Ball",
  "Ultra Ball",
  "Level Ball",
  "Quick Ball",
  "Hisuian Heavy Ball",
  "Battle VIP Pass",
  "Pokégear 3.0",
  "Buddy-Buddy Poffin",
  "Earthen Vessel",
  "Pokémon Catcher",
  "Boss's Orders",
  "Computer Search",
  "Luminous Energy",
  "Peonia",
];

function analyzeConsistency(cards: Card[]): ConsistencyMetrics {
  const drawSupporters: { name: string; qty: number }[] = [];
  const searchCards: { name: string; qty: number }[] = [];

  for (const card of cards) {
    const nameLower = card.name.toLowerCase();

    for (const ds of DRAW_SUPPORTERS) {
      if (nameLower.includes(ds.toLowerCase())) {
        drawSupporters.push({ name: card.name, qty: card.qty });
        break;
      }
    }

    for (const sc of SEARCH_CARDS) {
      if (nameLower.includes(sc.toLowerCase())) {
        searchCards.push({ name: card.name, qty: card.qty });
        break;
      }
    }
  }

  const totalDraw = drawSupporters.reduce((sum, d) => sum + d.qty, 0);
  const totalSearch = searchCards.reduce((sum, s) => sum + s.qty, 0);

  let rating: string;
  const combined = totalDraw + totalSearch;
  if (combined >= 16) rating = "Very High";
  else if (combined >= 12) rating = "High";
  else if (combined >= 8) rating = "Moderate";
  else if (combined >= 4) rating = "Low";
  else rating = "Very Low";

  return { drawSupporters, searchCards, totalDraw, totalSearch, rating };
}

/* ─── Warnings ───────────────────────────────────────────────── */

function generateWarnings(
  cards: Card[],
  sections: AnalysisResult["sections"],
  deckSize: number,
  consistency: ConsistencyMetrics
): string[] {
  const warnings: string[] = [];

  if (deckSize !== 60) {
    warnings.push(
      `Deck has ${deckSize} cards — standard format requires exactly 60.`
    );
  }

  if (sections.pokemon === 0) {
    warnings.push("No Pokémon detected. Check your deck list format.");
  }

  if (sections.energy === 0) {
    warnings.push(
      "No energy cards detected. Most decks need energy to attack."
    );
  }

  if (consistency.totalDraw < 4) {
    warnings.push(
      "Very few draw supporters — you may struggle with consistency."
    );
  }

  if (consistency.totalSearch < 4) {
    warnings.push(
      "Low search card count — consider adding more to find key pieces."
    );
  }

  // Check for more than 4 copies of any non-basic-energy card
  const nonEnergy = cards.filter(
    (c) =>
      c.section !== "energy" ||
      !c.name.toLowerCase().includes("basic")
  );
  for (const card of nonEnergy) {
    if (card.qty > 4) {
      warnings.push(
        `${card.name} has ${card.qty} copies — max 4 allowed (except basic energy).`
      );
    }
  }

  return warnings;
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

    const sections = {
      pokemon: cards
        .filter((c) => c.section === "pokemon")
        .reduce((s, c) => s + c.qty, 0),
      trainer: cards
        .filter((c) => c.section === "trainer")
        .reduce((s, c) => s + c.qty, 0),
      energy: cards
        .filter((c) => c.section === "energy")
        .reduce((s, c) => s + c.qty, 0),
    };

    const deckSize = sections.pokemon + sections.trainer + sections.energy;
    const energyProfile = analyzeEnergy(cards);
    const archetype = detectArchetype(cards);
    const consistency = analyzeConsistency(cards);
    const warnings = generateWarnings(cards, sections, deckSize, consistency);

    const result: AnalysisResult = {
      deckSize,
      sections,
      cards,
      energyProfile,
      archetype,
      consistency,
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
