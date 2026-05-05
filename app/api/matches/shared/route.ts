import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMatchCode } from "@/lib/match-codes";

/**
 * POST /api/matches/shared
 *
 * Creates a new shared match in `pending` state and returns the join code.
 * Body: { saved_deck_id: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { saved_deck_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { saved_deck_id } = body;
  if (!saved_deck_id) {
    return NextResponse.json({ error: "saved_deck_id is required." }, { status: 400 });
  }

  const { data: deck } = await supabase
    .from("saved_decks")
    .select("id, user_id")
    .eq("id", saved_deck_id)
    .maybeSingle();
  if (!deck || deck.user_id !== user.id) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  // Try up to 5 codes before giving up. Collisions on a 6-char/30-alphabet
  // space are astronomical at any realistic scale, but the loop guards
  // against the long tail.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateMatchCode();
    const { data, error } = await supabase
      .from("shared_matches")
      .insert({
        creator_user_id: user.id,
        creator_decklist_id: saved_deck_id,
        code,
      })
      .select("id, code")
      .single();

    if (!error && data) {
      return NextResponse.json({ id: data.id, code: data.code });
    }
    // Unique violation → retry with a new code. Anything else bubbles.
    if (error && error.code !== "23505") {
      console.error("[shared_matches] insert failed:", error);
      return NextResponse.json({ error: "Failed to create match." }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique code, please try again." },
    { status: 500 }
  );
}
