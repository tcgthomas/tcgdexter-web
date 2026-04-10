import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/profile
 *
 * Updates the authenticated user's profile. Currently supports:
 *   - display_name: string (1–30 chars, trimmed)
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

  if (!displayName || displayName.length === 0) {
    return NextResponse.json(
      { error: "Display name is required." },
      { status: 400 }
    );
  }

  if (displayName.length > 30) {
    return NextResponse.json(
      { error: "Display name must be 30 characters or fewer." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ display_name: displayName });
}
