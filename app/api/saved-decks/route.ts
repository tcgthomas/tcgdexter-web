import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/saved-decks
 *
 * Saves a deck list + analysis snapshot to the authenticated user's
 * personal "My Decks" library. Sign-in required.
 *
 * Body: { deckList: string, analysis?: object, name?: string }
 * If `name` is omitted, the name is derived from the analysis metaMatch
 * archetype (if present) or falls back to "Untitled Deck".
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to save decks." },
      { status: 401 }
    );
  }

  let body: { deckList?: string; analysis?: unknown; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deckList, analysis, name } = body;

  if (!deckList || typeof deckList !== "string" || !deckList.trim()) {
    return NextResponse.json(
      { error: "deckList is required" },
      { status: 400 }
    );
  }

  // Derive name if not provided: try the archetype match first, fall back
  // to a generic label. Users can rename from /my-decks.
  const analysisObj =
    analysis && typeof analysis === "object"
      ? (analysis as { metaMatch?: { archetypeName?: string | null } })
      : null;
  const archetype = analysisObj?.metaMatch?.archetypeName ?? null;
  const finalName =
    (typeof name === "string" && name.trim()) ||
    archetype ||
    "Untitled Deck";

  const { data, error } = await supabase
    .from("saved_decks")
    .insert({
      user_id: user.id,
      name: finalName,
      deck_list: deckList,
      analysis: analysis ?? null,
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    console.error("[saved-decks] insert failed:", error);
    return NextResponse.json(
      { error: "Failed to save deck." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
  });
}
