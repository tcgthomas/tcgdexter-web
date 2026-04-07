import Link from "next/link";
import buyListData from "@/data/buy-list.json";

/* ─── Types ────────────────────────────────────────────────────── */

interface BuyListItem {
  card_label: string;
  market_price: number;
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function BuyListPage() {
  const items = (buyListData as { items: BuyListItem[]; updated_at: string }).items;
  const updated_at = (buyListData as { items: BuyListItem[]; updated_at: string }).updated_at;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 pt-12 pb-8 px-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Buy List
        </h1>
        <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-md mx-auto leading-relaxed">
          Sell your collection: <a href="mailto:trade@tcgdexter.com" className="underline hover:text-text-secondary">trade@tcgdexter.com</a>
        </p>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg">
          {items.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              Check back soon &mdash; list updating.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-surface-2 ${
                    i < items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="font-semibold text-text-primary text-sm">
                    {item.card_label}
                  </span>
                  <span className="text-accent font-medium text-sm ml-4 flex-shrink-0">
                    ${item.market_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {updated_at && (
            <p className="mt-2 text-xs text-text-muted text-center">
              Last updated:{" "}
              {new Date(updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}
