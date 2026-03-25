import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.INIT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await initDb();
  return NextResponse.json({ ok: true, message: "DB initialized" });
}
