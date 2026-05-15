import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * POST /api/matches/shared/[id]/dispute
 *
 * Multipart form: image (File, required) + note (string, optional).
 * Uploads to the match-evidence bucket at {match_id}/{user_id}/{uuid}.{ext},
 * inserts match_evidence row, sets status to 'under_review'.
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form." }, { status: 400 });
  }

  const file = form.get("image");
  const note = (form.get("note") as string | null)?.trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image is required." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, or WebP images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 5 MB." },
      { status: 400 }
    );
  }

  const { data: match } = await supabase
    .from("shared_matches")
    .select("id, creator_user_id, opponent_user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  if (
    match.creator_user_id !== user.id &&
    match.opponent_user_id !== user.id
  ) {
    return NextResponse.json({ error: "Not a participant." }, { status: 403 });
  }
  if (match.status === "finalized") {
    return NextResponse.json(
      { error: "Match is already finalized." },
      { status: 409 }
    );
  }

  const ext = file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
    ? "webp"
    : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${id}/${user.id}/${filename}`;

  const { error: uploadErr } = await supabase.storage
    .from("match-evidence")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadErr) {
    console.error("[shared_matches/dispute] upload failed:", uploadErr);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { error: insertErr } = await supabase.from("match_evidence").insert({
    match_id: id,
    submitted_by_user_id: user.id,
    image_path: path,
    note,
  });
  if (insertErr) {
    console.error("[shared_matches/dispute] insert failed:", insertErr);
    return NextResponse.json({ error: "Failed to record evidence." }, { status: 500 });
  }

  const { error: statusErr } = await supabase
    .from("shared_matches")
    .update({ status: "under_review" })
    .eq("id", id);
  if (statusErr) {
    console.error("[shared_matches/dispute] status update failed:", statusErr);
    return NextResponse.json({ error: "Failed to escalate match." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
