import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTierForCount } from "@/lib/trainer-tiers";

/**
 * POST /api/saved-decks
 *
 * Saves a deck list + analysis snapshot to the authenticated user's
 * personal "My Decks" library. Sign-in required.
 *
 * After a successful save, checks whether the user has crossed a new
 * trainer-tier threshold and updates their profile if so. Returns the
 * new title (if upgraded) so the client can show a toast.
 *
 * Body: { deckList: string, analysis?: object, name?: string }
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

  // Derive name if not provided
  const analysisObj =
    analysis && typeof analysis === "object"
      ? (analysis as { metaMatch?: { archetypeName?: string | null } })
      : null;
  const archetype = analysisObj?.metaMatch?.archetypeName ?? null;
  const finalName =
    (typeof name === "string" && name.trim()) || archetype || "Untitled Deck";

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

  // ── Trainer-tier check ────────────────────────────────────────
  // Count total saved decks and update the profile's high-water-mark
  // and trainer title if the user crossed a new threshold.
  let newTitle: string | null = null;

  try {
    const { count } = await supabase
      .from("saved_decks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const currentCount = count ?? 0;

    // Fetch the current high-water-mark from the profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("highest_deck_count, trainer_title")
      .eq("id", user.id)
      .single();

    const previousHighWaterMark = profile?.highest_deck_count ?? 0;

    if (currentCount > previousHighWaterMark) {
      const tier = getTierForCount(currentCount);
      const updatedTitle = tier?.title ?? profile?.trainer_title ?? "Rookie Trainer";

      // Only update if there's actually a new high-water-mark
      await supabase
        .from("profiles")
        .update({
          highest_deck_count: currentCount,
          trainer_title: updatedTitle,
        })
        .eq("id", user.id);

      // Signal a title change to the client (so it can show a toast)
      if (updatedTitle !== profile?.trainer_title) {
        newTitle = updatedTitle;
      }
    }
  } catch (err) {
    // Non-fatal: the deck was already saved; a tier-check failure
    // should never block the success response.
    console.error("[saved-decks] tier-check failed:", err);
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    ...(newTitle ? { newTitle } : {}),
  });
}
