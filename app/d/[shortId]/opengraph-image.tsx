import { ImageResponse } from "@vercel/og";
import { buildSubtypesByName, buildTypesByName } from "@/lib/cardTypes";
import {
  buildMatrixSlots,
  hexToRgba,
  MATRIX_ENERGY_PALETTE,
  pokemonPrimaryTypes,
  type MatrixSlot,
} from "@/lib/deckMatrix";

// Runs on Node.js (default) rather than edge: lib/cardTypes pulls in the full
// 12MB cards-standard.json for type/subtype lookup, which blows past the 1MB
// edge function bundle limit. This route is cached for 7 days anyway, so
// cold-start latency on Node is a non-issue.
export const alt = "Deck Profile — TCG Dexter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface DeckCard {
  qty: number;
  name: string;
  section: string;
}

interface AnalysisResult {
  deckSize: number;
  sections: {
    pokemon: number;
    trainer: number;
    energy: number;
  };
  deckPrice: number;
  rotation: { ready: boolean };
  metaMatch: {
    matched: boolean;
    archetypeName: string | null;
    matchPct: number | null;
  };
  cards: DeckCard[];
}

interface DeckRecord {
  profiledAt: string;
  analysis: AnalysisResult;
}

/**
 * Fetch a deck share from Supabase using a direct REST call. We only need a
 * public anon read here, so skip @supabase/ssr to avoid pulling cookies into
 * what is otherwise a stateless metadata route. The RLS policy
 * `deck_shares_public_read` allows anon reads.
 */
async function fetchDeck(shortId: string): Promise<DeckRecord | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/deck_shares?id=eq.${encodeURIComponent(shortId)}&select=analysis,created_at`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        // deck_shares rows are immutable; cache aggressively. Vercel
        // invalidates this whole route on each deploy, so layout updates
        // still propagate.
        next: { revalidate: 60 * 60 * 24 * 7 },
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      analysis: AnalysisResult;
      created_at: string;
    }>;
    if (!rows.length) return null;
    return {
      analysis: rows[0].analysis,
      profiledAt: rows[0].created_at,
    };
  } catch {
    return null;
  }
}

/* ─── Tile rendering ─────────────────────────────────────────── */

const TILE_SIZE = 46;
const TILE_GAP = 8;
const TILE_RADIUS = 6;

/** Render a single matrix slot as inline-styled JSX. Mirrors the in-app
 *  tile styling but drops labels for a cleaner rich-link look. */
function renderTile(slot: MatrixSlot, i: number) {
  const base = {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
    display: "flex",
  } as const;

  if (slot.kind === "empty") {
    return (
      <div
        key={i}
        style={{
          ...base,
          border: "2px dashed rgba(0,0,0,0.18)",
          background: "transparent",
        }}
      />
    );
  }
  if (slot.kind === "pokemon") {
    const baseColor = slot.energyType
      ? MATRIX_ENERGY_PALETTE[slot.energyType]
      : MATRIX_ENERGY_PALETTE.Colorless;
    return (
      <div
        key={i}
        style={{ ...base, background: hexToRgba(baseColor, 0.5) }}
      />
    );
  }
  if (slot.kind === "trainer") {
    return <div key={i} style={{ ...base, background: "#E6E6E6" }} />;
  }
  if (slot.kind === "trainer-ace" || slot.kind === "energy-ace") {
    return <div key={i} style={{ ...base, background: "#ED008C" }} />;
  }
  if (slot.kind === "energy-basic") {
    const color = slot.energyType
      ? MATRIX_ENERGY_PALETTE[slot.energyType]
      : MATRIX_ENERGY_PALETTE.Colorless;
    return <div key={i} style={{ ...base, background: color }} />;
  }
  // energy-special (non-ACE)
  return (
    <div
      key={i}
      style={{
        ...base,
        backgroundImage: "linear-gradient(135deg,#C9C5BC 0%,#A8A8A8 100%)",
      }}
    />
  );
}

/** Five rows of twelve tiles. */
function renderMatrix(slots: MatrixSlot[]) {
  const rows: MatrixSlot[][] = [];
  for (let r = 0; r < 5; r++) {
    rows.push(slots.slice(r * 12, r * 12 + 12));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: TILE_GAP }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: TILE_GAP }}>
          {row.map((slot, c) => renderTile(slot, r * 12 + c))}
        </div>
      ))}
    </div>
  );
}

/** Compact legend swatch + label + count. */
function LegendItem({
  swatch,
  label,
  count,
}: {
  swatch: React.CSSProperties;
  label: string;
  count: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 16, height: 16, borderRadius: 4, ...swatch }} />
      <div style={{ display: "flex", fontSize: 16, color: "#2c1f0e", fontWeight: 600 }}>
        {count}
      </div>
      <div style={{ display: "flex", fontSize: 14, color: "#8b6040", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Image route ────────────────────────────────────────────── */

export default async function Image({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const deck = await fetchDeck(shortId);

  if (!deck) {
    // Generic fallback card
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5ede0",
            border: "4px solid #ecdcc8",
            borderRadius: "24px",
          }}
        >
          <div style={{ display: "flex", fontSize: "28px", color: "#8b6040" }}>
            TCG Dexter
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 700,
              color: "#2c1f0e",
              marginTop: "16px",
            }}
          >
            Deck Profile
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 56,
              backgroundColor: "#2c1f0e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0 0 20px 20px",
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#f5ede0" }}>
              tcgdexter.com
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const { analysis, profiledAt } = deck;
  const title = analysis.metaMatch.archetypeName ?? "Deck Profile";
  const dateStr = new Date(profiledAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Build the matrix slots from the frozen analysis
  const cards = analysis.cards ?? [];
  const pokemonTypes = pokemonPrimaryTypes(buildTypesByName(cards));
  const subtypesByName = buildSubtypesByName(cards);
  const slots = buildMatrixSlots(cards, pokemonTypes, subtypesByName);
  const aceCount = slots.filter(
    (s) => s.kind === "trainer-ace" || s.kind === "energy-ace",
  ).length;

  // Pokémon legend swatch — sample the deck's dominant Pokémon type so the
  // chip reflects this specific build (mirrors DeckProfileView behavior).
  const pokemonTypeCounts = new Map<string, number>();
  for (const s of slots) {
    if (s.kind === "pokemon" && s.energyType) {
      pokemonTypeCounts.set(
        s.energyType,
        (pokemonTypeCounts.get(s.energyType) ?? 0) + 1,
      );
    }
  }
  const dominantPokemonType = Array.from(pokemonTypeCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const pokemonSwatchColor = dominantPokemonType
    ? MATRIX_ENERGY_PALETTE[dominantPokemonType]
    : MATRIX_ENERGY_PALETTE.Colorless;

  // Pills
  const rotationReady = analysis.rotation.ready;
  const rotationLabel = rotationReady ? "✓ Standard Legal" : "⚠ Not Standard Legal";
  const rotationBg = rotationReady ? "#dcfce7" : "#fef3c7";
  const rotationBorder = rotationReady ? "#bbf7d0" : "#fde68a";
  const rotationColor = rotationReady ? "#166534" : "#92400e";

  const priceLabel =
    analysis.deckPrice > 0 ? `$${analysis.deckPrice.toFixed(2)}` : null;

  const metaMatched = analysis.metaMatch.matched;
  const metaLabel = metaMatched
    ? `${analysis.metaMatch.archetypeName} · ${((analysis.metaMatch.matchPct ?? 0) * 100).toFixed(1)}%`
    : "No Meta Match";
  const metaBg = metaMatched ? "#dcfce7" : "#f3f4f6";
  const metaBorder = metaMatched ? "#bbf7d0" : "#e5e7eb";
  const metaColor = metaMatched ? "#166534" : "#6b7280";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f5ede0",
          border: "4px solid #ecdcc8",
          borderRadius: 24,
          position: "relative",
        }}
      >
        {/* Body row: matrix on left, meta on right */}
        <div style={{ display: "flex", flex: 1, padding: "40px 48px 24px" }}>
          {/* Left column — matrix + legend */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 720,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "#8b6040",
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 16,
              }}
            >
              Deck Composition
              {analysis.deckSize !== 60 ? ` · ${analysis.deckSize}/60` : ""}
            </div>

            {renderMatrix(slots)}

            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <LegendItem
                swatch={{ background: hexToRgba(pokemonSwatchColor, 0.5) }}
                label="Pokémon"
                count={analysis.sections.pokemon}
              />
              <LegendItem
                swatch={{ background: "#E6E6E6" }}
                label="Trainer"
                count={analysis.sections.trainer}
              />
              <LegendItem
                swatch={{ background: MATRIX_ENERGY_PALETTE.Lightning }}
                label="Energy"
                count={analysis.sections.energy}
              />
              {aceCount > 0 && (
                <LegendItem
                  swatch={{ background: "#ED008C" }}
                  label="Ace Spec"
                  count={aceCount}
                />
              )}
            </div>
          </div>

          {/* Right column — wordmark + title + date + pills */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              paddingLeft: 40,
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 22, color: "#8b6040", marginBottom: 16 }}>
              TCG Dexter
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 700,
                color: "#2c1f0e",
                lineHeight: 1.1,
                letterSpacing: -0.5,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "#8b6040", marginTop: 10 }}>
              Profiled {dateStr}
            </div>

            {/* Pills stacked vertically */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 28,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: rotationBg,
                  border: `2px solid ${rotationBorder}`,
                  fontSize: 18,
                  fontWeight: 600,
                  color: rotationColor,
                }}
              >
                {rotationLabel}
              </div>
              {priceLabel && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 18px",
                    borderRadius: 999,
                    backgroundColor: "#f5ede0",
                    border: "2px solid #ecdcc8",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#2c1f0e",
                  }}
                >
                  {priceLabel}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: metaBg,
                  border: `2px solid ${metaBorder}`,
                  fontSize: 18,
                  fontWeight: 600,
                  color: metaColor,
                  maxWidth: 380,
                }}
              >
                {metaLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 56,
            backgroundColor: "#2c1f0e",
            borderRadius: "0 0 20px 20px",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, color: "#f5ede0" }}>
            tcgdexter.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
