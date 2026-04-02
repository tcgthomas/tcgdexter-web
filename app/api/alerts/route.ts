import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

interface AlertEntry {
  id: string;
  email: string;
  threshold: number;
  deckList: string;
  deckPriceAtSubscription: number;
  lastCheckedPrice: number;
  lastNotified: string | null;
  createdAt: string;
  status: "active" | "paused" | "triggered";
}

export async function POST(req: NextRequest) {
  let body: { email?: string; threshold?: number; deckList?: string; deckPrice?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { email, threshold, deckList, deckPrice } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (typeof threshold !== "number" || threshold <= 0) {
    return NextResponse.json({ error: "Threshold must be a positive number." }, { status: 400 });
  }
  if (!deckList || typeof deckList !== "string" || !deckList.trim()) {
    return NextResponse.json({ error: "Deck list is required." }, { status: 400 });
  }
  if (typeof deckPrice !== "number" || deckPrice <= 0) {
    return NextResponse.json({ error: "Deck price is required." }, { status: 400 });
  }

  const id = randomUUID();

  const alert: AlertEntry = {
    id,
    email: email.trim().toLowerCase(),
    threshold,
    deckList: deckList.trim(),
    deckPriceAtSubscription: deckPrice,
    lastCheckedPrice: deckPrice,
    lastNotified: null,
    createdAt: new Date().toISOString(),
    status: "active",
  };

  try {
    await put(`alerts/${id}.json`, JSON.stringify(alert), {
      access: "public",
      contentType: "application/json",
    });
  } catch (err) {
    console.error("Vercel Blob put failed:", err);
    return NextResponse.json({ error: "Failed to save alert." }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
