import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/matches/[id]
 *
 * Deletes a match record. RLS enforces owner-only access.
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
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { error } = await supabase.from("matches").delete().eq("id", id);

  if (error) {
    console.error("[matches] delete failed:", error);
    return NextResponse.json({ error: "Failed to delete match." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
