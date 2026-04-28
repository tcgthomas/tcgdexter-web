import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * POST /api/profile/avatar  (multipart/form-data, field "file")
 *
 * Uploads an avatar image to the public `avatars` bucket under
 * `{user_id}/avatar.{ext}`, then writes the resulting public URL to
 * profiles.avatar_url. A cache-buster query string is appended so the
 * browser picks up replacements immediately.
 *
 * DELETE clears the saved avatar_url (the file in storage is left in place;
 * the next upload overwrites it via the deterministic path).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Avatar must be a PNG, JPEG, or WebP image." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Avatar must be 2 MB or smaller." },
      { status: 400 }
    );
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[avatar] upload failed:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload avatar." },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    console.error("[avatar] profile update failed:", profileError);
    return NextResponse.json(
      { error: "Avatar uploaded but profile update failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatar_url: avatarUrl });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    console.error("[avatar] clear failed:", error);
    return NextResponse.json(
      { error: "Failed to clear avatar." },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatar_url: null });
}
