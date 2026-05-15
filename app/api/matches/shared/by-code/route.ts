import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/matches/shared/by-code?code=ABC123
 *
 * Looks up a pending match by its code and returns minimal join-confirmation
 * info. 404 if invalid, used, or expired. The caller must be authenticated
 * to use this endpoint (so we can also catch self-join attempts early).
 */
export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }

  // RLS would normally hide a row the caller isn't a participant of, but
  // the participant_read policy lets the creator see their own code, and
  // by definition a pending row hasn't been joined yet. To allow a third-
  // party lookup we fetch via a trusted lookup that bypasses participant
  // checks: we only need a tiny set of fields and the shape of the row
  // determines the response. We use `.maybeSingle()` and rely on the
  // RPC-like query restricted by `code`.
  //
  // Important: the participant_read policy already covers the creator's
  // own pending row. Other authenticated users can't read pending rows
  // by RLS, so we use a SECURITY DEFINER RPC. For v1, however, we keep
  // things simple by piggy-backing on the public_read_finalized policy
  // being insufficient and instead fetching from a view that allows
  // pending lookups by exact code only.
  //
  // To avoid complicating the migration, we do this: SECURITY DEFINER fn.
  const { data, error } = await supabase.rpc("lookup_shared_match_by_code", {
    p_code: code,
  });

  if (error) {
    console.error("[shared_matches/by-code] rpc failed:", error);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json({ error: "Code not found, used, or expired." }, { status: 404 });
  }
  if (row.creator_user_id === user.id) {
    return NextResponse.json(
      { error: "You can't join your own match." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: row.match_id,
    creator: {
      display_name: row.creator_display_name,
      username: row.creator_username,
    },
    creator_deck: {
      id: row.creator_decklist_id,
      name: row.creator_deck_name,
      archetype: row.creator_deck_archetype,
    },
    expires_at: row.expires_at,
  });
}
