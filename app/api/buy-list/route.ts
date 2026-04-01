import { NextResponse } from "next/server";
import buyListData from "@/data/buy-list.json";

export interface BuyListItem {
  card_label: string;
  market_price: number;
}

export async function GET() {
  const data = buyListData as { items: BuyListItem[]; updated_at: string };
  return NextResponse.json({
    items: data.items,
    updated_at: data.updated_at,
  });
}
