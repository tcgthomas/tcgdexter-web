import { ImageResponse } from "@vercel/og";

export const runtime = "edge";
export const alt = "Deck Profile — TCG Dexter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface AnalysisResult {
  deckPrice: number;
  rotation: { ready: boolean };
  metaMatch: {
    matched: boolean;
    archetypeName: string | null;
    matchPct: number | null;
  };
}

interface DeckRecord {
  profiledAt: string;
  analysis: AnalysisResult;
}

/**
 * Fetch a deck share from Supabase using a direct REST call. We don't use
 * @supabase/ssr here because this component runs on Edge runtime without
 * access to Next's cookies() API, and we only need a public read. The
 * RLS policy `deck_shares_public_read` allows anon reads.
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
        // Cache the OG image fetch for a minute — these are deterministic once written
        next: { revalidate: 60 },
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
          <div style={{ fontSize: "28px", color: "#8b6040" }}>TCG Dexter</div>
          <div
            style={{
              fontSize: "56px",
              fontWeight: "700",
              color: "#2c1f0e",
              marginTop: "16px",
            }}
          >
            Deck Profile
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "0",
              left: "0",
              right: "0",
              height: "56px",
              backgroundColor: "#2c1f0e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0 0 20px 20px",
            }}
          >
            <div style={{ fontSize: "20px", color: "#f5ede0" }}>
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

  // Rotation pill
  const rotationReady = analysis.rotation.ready;
  const rotationLabel = rotationReady ? "✓ Rotation Ready" : "⚠ Rotation Blocked";
  const rotationBg = rotationReady ? "#dcfce7" : "#fef3c7";
  const rotationBorder = rotationReady ? "#bbf7d0" : "#fde68a";
  const rotationColor = rotationReady ? "#166534" : "#92400e";

  // Price pill
  const priceLabel =
    analysis.deckPrice > 0 ? `$${analysis.deckPrice.toFixed(2)}` : null;

  // Meta pill
  const metaMatched = analysis.metaMatch.matched;
  const metaLabel = metaMatched
    ? `${analysis.metaMatch.archetypeName} ${((analysis.metaMatch.matchPct ?? 0) * 100).toFixed(1)}%`
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
          borderRadius: "24px",
          position: "relative",
        }}
      >
        {/* Top section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: "1",
            padding: "48px 64px",
          }}
        >
          {/* Wordmark */}
          <div style={{ fontSize: "24px", color: "#8b6040", marginBottom: "24px" }}>
            TCG Dexter
          </div>

          {/* Deck title */}
          <div
            style={{
              fontSize: "48px",
              fontWeight: "700",
              color: "#2c1f0e",
              textAlign: "center",
              lineHeight: "1.1",
            }}
          >
            {title}
          </div>

          {/* Profiled date */}
          <div
            style={{
              fontSize: "20px",
              color: "#8b6040",
              marginTop: "12px",
            }}
          >
            Profiled {dateStr}
          </div>

          {/* Stat pills row */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "40px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {/* Rotation pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                borderRadius: "999px",
                backgroundColor: rotationBg,
                border: `2px solid ${rotationBorder}`,
                fontSize: "22px",
                fontWeight: "600",
                color: rotationColor,
              }}
            >
              {rotationLabel}
            </div>

            {/* Price pill */}
            {priceLabel && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 24px",
                  borderRadius: "999px",
                  backgroundColor: "#f5ede0",
                  border: "2px solid #ecdcc8",
                  fontSize: "22px",
                  fontWeight: "600",
                  color: "#2c1f0e",
                }}
              >
                {priceLabel}
              </div>
            )}

            {/* Meta pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                borderRadius: "999px",
                backgroundColor: metaBg,
                border: `2px solid ${metaBorder}`,
                fontSize: "22px",
                fontWeight: "600",
                color: metaColor,
              }}
            >
              {metaLabel}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "56px",
            backgroundColor: "#2c1f0e",
            borderRadius: "0 0 20px 20px",
          }}
        >
          <div style={{ fontSize: "20px", color: "#f5ede0" }}>
            tcgdexter.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
