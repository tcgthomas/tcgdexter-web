import { NextResponse } from "next/server";

/* ─── Set abbreviation mappings ────────────────────────────────── */

const SET_ABBREVIATIONS: Record<string, string> = {
  "Prismatic Evolutions": "PRE",
  "Surging Sparks": "SSP",
  "Stellar Crown": "SCR",
  "Shrouded Fable": "SFA",
  "Twilight Masquerade": "TWM",
  "Temporal Forces": "TEF",
  "Paldean Fates": "PAF",
  "Paradox Rift": "PAR",
  "Obsidian Flames": "OBF",
  "Paldea Evolved": "PAL",
  "Scarlet & Violet": "SVI",
  "151": "MEW",
  "Journey Together": "JTG",
  "Destined Rivals": "DRI",
  "Black Bolt": "SV10",
  "White Flare": "SV11",
  "Mega Evolution": "SV12",
  "Perfect Order": "SV13",
  "Ascended Heroes": "SV14",
};

function getSetAbbreviation(setName: string | null | undefined): string {
  if (!setName) return "";
  if (SET_ABBREVIATIONS[setName]) return SET_ABBREVIATIONS[setName];
  // Derive 2-3 char abbreviation from first letters of words
  const words = setName.split(/\s+/).filter(Boolean);
  return words
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 3);
}

function formatCardLabel(
  cardName: string,
  setName: string | null | undefined,
  cardNumber: string | null | undefined
): string {
  let label = cardName;
  const abbr = getSetAbbreviation(setName);
  if (abbr) label += ` ${abbr}`;
  if (cardNumber) label += ` ${cardNumber}`;
  return label;
}

/* ─── Route handler ────────────────────────────────────────────── */

interface DaemonEntry {
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  market_price: number;
  signal_type: string;
  source: string;
}

export interface BuyListItem {
  card_label: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  market_price: number;
  buy_rate: number;
  signal_type: string;
  source: string;
}

export async function GET() {
  try {
    const res = await fetch(
      "http://localhost:8789/v1/buy-list?status=active&limit=100",
      {
        headers: { "X-API-Key": "dexter-local-key-2025" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ items: [], updated_at: null });
    }

    const data: DaemonEntry[] = await res.json();

    const filtered = data
      .filter((entry) => entry.market_price >= 5.0)
      .sort((a, b) => b.market_price - a.market_price)
      .slice(0, 25);

    const items: BuyListItem[] = filtered.map((entry) => ({
      card_label: formatCardLabel(
        entry.card_name,
        entry.set_name,
        entry.card_number
      ),
      card_name: entry.card_name,
      set_name: entry.set_name,
      card_number: entry.card_number,
      market_price: entry.market_price,
      buy_rate: Math.round(entry.market_price * 0.7 * 100) / 100,
      signal_type: entry.signal_type,
      source: entry.source,
    }));

    return NextResponse.json({
      items,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Daemon unreachable — graceful fallback
    return NextResponse.json({ items: [], updated_at: null });
  }
}
