import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/matches/shared/[id]/join
 *
 * Body: { code: string, saved_deck_id: string }
 *
 * Joins User B to a pending shared match by code. The atomic claim happens
 * inside the claim_shared_match RPC (SECURITY DEFINER) to prevent the race
 * where two users redeem the same code at the same instant. The [id] in
 * the URL is informational — the RPC matches on code.
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { code?: string; saved_deck_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const saved_deck_id = body.saved_deck_id;
  if (!code || !saved_deck_id) {
    return NextResponse.json(
      { error: "code and saved_deck_id are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("claim_shared_match", {
    p_code: code,
    p_opponent_decklist_id: saved_deck_id,
  });

  if (error) {
    // Postgres errcode 22023 = our "invalid/used/expired/self-join" raise;
    // 42501 = "auth/deck not owned" raise.
    const status = error.code === "42501" ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json(
      { error: "Code invalid, used, or expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({ id: row.match_id });
}
