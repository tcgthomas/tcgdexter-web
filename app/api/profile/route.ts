import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateDisplayName } from "@/lib/display-name-rules";

/**
 * PATCH /api/profile
 *
 * Updates the authenticated user's profile. Currently supports:
 *   - display_name: string (2–30 chars, alphanumeric + spaces/hyphens/underscores,
 *     not on the blocklist, must be unique case-insensitively)
 *
 * Returns the updated profile fields on success.
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  let body: { display_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName = body.display_name?.trim();

  if (!displayName) {
    return NextResponse.json(
      { error: "Display name is required." },
      { status: 400 }
    );
  }

  // ── Format + blocklist validation ─────────────────────────────
  const validation = validateDisplayName(displayName);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // ── Uniqueness check (case-insensitive) ───────────────────────
  // The DB has a unique index on lower(display_name) that enforces this,
  // but checking beforehand gives us a friendlier error message than
  // catching a Postgres unique_violation after the fact.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", displayName)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return NextResponse.json(
      { error: "That display name is already taken." },
      { status: 409 }
    );
  }

  // ── Update ────────────────────────────────────────────────────
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) {
    // Catch the race condition where another user grabbed the name between
    // our check and the update.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That display name is already taken." },
        { status: 409 }
      );
    }
    console.error("[profile] update failed:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ display_name: displayName });
}
