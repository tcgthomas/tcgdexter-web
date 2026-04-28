import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/saved-decks/[id]
 * PATCH  /api/saved-decks/[id]   body: { name?: string, notes?: string }
 *
 * Both require authentication. RLS on public.saved_decks ensures users
 * can only modify their own rows.
 */

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const { error } = await supabase.from("saved_decks").delete().eq("id", id);

  if (error) {
    console.error("[saved-decks] delete failed:", error);
    return NextResponse.json(
      { error: "Failed to delete deck." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  let body: { name?: string; notes?: string; is_public?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build the update payload — only include provided fields
  const updates: Record<string, string | boolean> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (typeof body.notes === "string") {
    updates.notes = body.notes;
  }

  if (typeof body.is_public === "boolean") {
    updates.is_public = body.is_public;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("saved_decks")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[saved-decks] update failed:", error);
    return NextResponse.json(
      { error: "Failed to update deck." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, ...updates });
}
