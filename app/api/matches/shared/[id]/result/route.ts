import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deriveTransition,
  winnerUserIdFromOutcome,
  type SharedResult,
} from "@/lib/shared-matches";

/**
 * POST /api/matches/shared/[id]/result
 *
 * Body: { result: 'win' | 'loss' | 'draw' }
 *
 * Writes the caller's result to the appropriate column based on which
 * participant they are, then evaluates the state transition: matching →
 * finalized, mismatched → conflict. Submissions are blocked while the
 * match is finalized or under_review.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { result?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = body.result;
  if (result !== "win" && result !== "loss" && result !== "draw") {
    return NextResponse.json(
      { error: "result must be win, loss, or draw." },
      { status: 400 }
    );
  }

  const { data: match, error: fetchErr } = await supabase
    .from("shared_matches")
    .select(
      "id, creator_user_id, opponent_user_id, creator_result, opponent_result, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[shared_matches/result] fetch failed:", fetchErr);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const isCreator = match.creator_user_id === user.id;
  const isOpponent = match.opponent_user_id === user.id;
  if (!isCreator && !isOpponent) {
    return NextResponse.json({ error: "Not a participant." }, { status: 403 });
  }
  if (match.status === "under_review") {
    return NextResponse.json(
      { error: "Match is under judge review and locked." },
      { status: 409 }
    );
  }
  if (match.status === "finalized") {
    return NextResponse.json(
      { error: "Match is already finalized." },
      { status: 409 }
    );
  }
  if (!match.opponent_user_id) {
    return NextResponse.json(
      { error: "Waiting for an opponent to join." },
      { status: 409 }
    );
  }

  const nextCreator = (
    isCreator ? result : match.creator_result
  ) as SharedResult | null;
  const nextOpponent = (
    isOpponent ? result : match.opponent_result
  ) as SharedResult | null;

  const transition = deriveTransition(nextCreator, nextOpponent);

  const update: Record<string, unknown> = isCreator
    ? { creator_result: result }
    : { opponent_result: result };

  if (transition) {
    update.status = transition.status;
    if (transition.status === "finalized") {
      update.final_outcome = transition.outcome;
      update.final_winner_user_id = winnerUserIdFromOutcome(
        {
          creator_user_id: match.creator_user_id,
          opponent_user_id: match.opponent_user_id,
        },
        transition.outcome
      );
      update.finalized_at = new Date().toISOString();
    } else {
      // Conflict — clear any prior finalize fields just in case (defensive,
      // shouldn't be set in pending/conflict states).
      update.final_outcome = null;
      update.final_winner_user_id = null;
      update.finalized_at = null;
    }
  } else {
    update.status = "pending";
  }

  const { error: updErr } = await supabase
    .from("shared_matches")
    .update(update)
    .eq("id", id);

  if (updErr) {
    console.error("[shared_matches/result] update failed:", updErr);
    return NextResponse.json({ error: "Failed to record result." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: update.status });
}
