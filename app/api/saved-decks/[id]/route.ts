import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/saved-decks/[id]
 * PATCH  /api/saved-decks/[id]   body: { name: string }
 *
 * Both require authentication. RLS on public.saved_decks ensures users
 * can only modify their own rows; this route relies on that rather than
 * checking ownership in application code.
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

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("saved_decks")
    .update({ name })
    .eq("id", id);

  if (error) {
    console.error("[saved-decks] update failed:", error);
    return NextResponse.json(
      { error: "Failed to rename deck." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, name });
}
