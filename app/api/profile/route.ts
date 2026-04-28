import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateDisplayName } from "@/lib/display-name-rules";

const BIO_MAX_LENGTH = 240;

/**
 * GET /api/profile
 *
 * Returns the authenticated user's editable profile fields. Used by client
 * components that can't reliably query Supabase directly due to RLS policies.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_public, avatar_url, bio")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    is_public: profile?.is_public ?? false,
    avatar_url: profile?.avatar_url ?? null,
    bio: profile?.bio ?? null,
  });
}

/**
 * PATCH /api/profile
 *
 * Updates the authenticated user's profile. Each field is independently
 * optional — the client may send any subset.
 *   - display_name: 2–30 chars, alphanumeric + spaces/hyphens/underscores,
 *     blocklisted, unique case-insensitively
 *   - is_public:    boolean — opts the profile in to public surfaces
 *   - avatar_url:   string | null — set after a successful avatar upload, or
 *     null to clear
 *   - bio:          string | null — up to 240 chars; trimmed; null clears
 *
 * Returns the updated fields on success.
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: {
    display_name?: string;
    is_public?: boolean;
    avatar_url?: string | null;
    bio?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // ── display_name ──────────────────────────────────────────────
  if (typeof body.display_name === "string") {
    const displayName = body.display_name.trim();
    if (!displayName) {
      return NextResponse.json(
        { error: "Display name is required." },
        { status: 400 }
      );
    }

    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Friendly uniqueness check; the unique index is the real guard.
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

    updates.display_name = displayName;
  }

  // ── is_public ─────────────────────────────────────────────────
  if (typeof body.is_public === "boolean") {
    updates.is_public = body.is_public;
  }

  // ── avatar_url ────────────────────────────────────────────────
  // Accept the public URL the client received from /api/profile/avatar,
  // or null to clear. We don't validate the URL itself — the storage RLS
  // policy already restricts who can write into the avatars bucket.
  if (body.avatar_url === null || typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url;
  }

  // ── bio ───────────────────────────────────────────────────────
  if (body.bio === null) {
    updates.bio = null;
  } else if (typeof body.bio === "string") {
    const bio = body.bio.trim();
    if (bio.length > BIO_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Bio must be ${BIO_MAX_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    updates.bio = bio.length === 0 ? null : bio;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
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

  return NextResponse.json(updates);
}
