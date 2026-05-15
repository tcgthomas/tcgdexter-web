import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  winnerUserIdFromOutcome,
  type SharedOutcome,
} from "@/lib/shared-matches";

/**
 * POST /api/admin/matches/[id]/rule
 *
 * Admin-only. Body: { outcome: 'creator_win' | 'opponent_win' | 'draw', note?: string }
 * Inserts a match_judge_rulings row, marks the shared_match as
 * judge_ruled, and finalizes it with the chosen outcome.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  let body: { outcome?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const outcome = body.outcome as SharedOutcome | undefined;
  if (
    outcome !== "creator_win" &&
    outcome !== "opponent_win" &&
    outcome !== "draw"
  ) {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 });
  }

  const { data: match } = await supabase
    .from("shared_matches")
    .select("id, creator_user_id, opponent_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!match || !match.opponent_user_id) {
    return NextResponse.json({ error: "Match not found or unjoined." }, { status: 404 });
  }

  const winnerUserId = winnerUserIdFromOutcome(
    {
      creator_user_id: match.creator_user_id,
      opponent_user_id: match.opponent_user_id,
    },
    outcome
  );

  const { error: rulingErr } = await supabase.from("match_judge_rulings").insert({
    match_id: id,
    ruled_by_user_id: user.id,
    winner_user_id: winnerUserId,
    outcome,
    note: body.note?.trim() || null,
  });
  if (rulingErr) {
    console.error("[admin/matches/rule] ruling insert failed:", rulingErr);
    return NextResponse.json({ error: "Failed to record ruling." }, { status: 500 });
  }

  const { error: updErr } = await supabase
    .from("shared_matches")
    .update({
      status: "finalized",
      final_outcome: outcome,
      final_winner_user_id: winnerUserId,
      judge_ruled: true,
      finalized_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    console.error("[admin/matches/rule] match update failed:", updErr);
    return NextResponse.json({ error: "Failed to finalize match." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
