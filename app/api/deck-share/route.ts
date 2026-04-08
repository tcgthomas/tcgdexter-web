import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/deck-share
 *
 * Persists a deck list + analysis snapshot under a short id and returns
 * the public URL. Works for both signed-in and anonymous users: if a
 * session cookie is present, the row gets attached to the user; otherwise
 * it's inserted with user_id = null.
 *
 * Phase 2 migration: previously wrote JSON to public Vercel Blob at
 * `decks/<shortId>.json`. Now writes a row to public.deck_shares on
 * Supabase Postgres with RLS that allows anyone to read by id.
 */
export async function POST(req: Request) {
  let body: { deckList?: string; analysis?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deckList, analysis } = body;

  if (!deckList || typeof deckList !== "string" || !deckList.trim()) {
    return NextResponse.json(
      { error: "deckList is required" },
      { status: 400 }
    );
  }
  if (!analysis || typeof analysis !== "object") {
    return NextResponse.json(
      { error: "analysis is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Attach user_id if the caller is signed in; null otherwise.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shortId = nanoid(8);

  const { error } = await supabase.from("deck_shares").insert({
    id: shortId,
    user_id: user?.id ?? null,
    deck_list: deckList,
    analysis,
  });

  if (error) {
    console.error("[deck-share] insert failed:", error);
    return NextResponse.json(
      { error: "Failed to share deck" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    shortId,
    url: `https://tcgdexter.com/d/${shortId}`,
  });
}
