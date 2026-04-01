import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { deckList, analysis } = await req.json();

    if (!deckList || !analysis) {
      return NextResponse.json(
        { error: "deckList and analysis are required" },
        { status: 400 },
      );
    }

    const shortId = nanoid(8);

    const payload = {
      deckList,
      profiledAt: new Date().toISOString(),
      analysis,
    };

    await put(`decks/${shortId}.json`, JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({
      shortId,
      url: `https://tcgdexter.com/d/${shortId}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to share deck" },
      { status: 500 },
    );
  }
}
