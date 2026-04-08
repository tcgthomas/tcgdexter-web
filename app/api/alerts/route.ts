import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/alerts
 *
 * Creates a price-drop alert subscription. SIGN-IN REQUIRED as of Phase 2.
 *
 * Phase 2 changes:
 *   - Now requires an authenticated user; email is read from the session,
 *     not the request body.
 *   - Writes to public.price_alerts (Supabase Postgres) instead of a
 *     public Vercel Blob key.
 *   - RLS enforces that users can only create alerts for themselves.
 */
export async function POST(req: NextRequest) {
  let body: { threshold?: number; deckList?: string; deckPrice?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { threshold, deckList, deckPrice } = body;

  if (typeof threshold !== "number" || threshold <= 0) {
    return NextResponse.json(
      { error: "Threshold must be a positive number." },
      { status: 400 }
    );
  }
  if (!deckList || typeof deckList !== "string" || !deckList.trim()) {
    return NextResponse.json(
      { error: "Deck list is required." },
      { status: 400 }
    );
  }
  if (typeof deckPrice !== "number" || deckPrice <= 0) {
    return NextResponse.json(
      { error: "Deck price is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to create price alerts." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: user.id,
      threshold,
      deck_list: deckList.trim(),
      deck_price_at_subscription: deckPrice,
      last_checked_price: deckPrice,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[alerts] insert failed:", error);
    return NextResponse.json(
      { error: "Failed to save alert." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}
