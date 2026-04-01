import Link from "next/link";

/* ─── Types ────────────────────────────────────────────────────── */

interface BuyListItem {
  card_label: string;
  market_price: number;
  buy_rate: number;
}

interface BuyListResponse {
  items: BuyListItem[];
  updated_at: string | null;
}

/* ─── Data fetching ────────────────────────────────────────────── */

async function getBuyList(): Promise<BuyListResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/buy-list`, {
      cache: "no-store",
    });
    if (!res.ok) return { items: [], updated_at: null };
    return res.json();
  } catch {
    return { items: [], updated_at: null };
  }
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function BuyListPage() {
  const { items, updated_at } = await getBuyList();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 pt-12 pb-8 px-6 text-center">
        <div className="text-left mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-brown-500 hover:text-brown-900 text-sm transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Home
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Buy List
        </h1>
        <p className="mt-3 text-sm sm:text-base text-brown-500 max-w-md mx-auto leading-relaxed">
          Cards we&rsquo;re actively looking to acquire
        </p>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg">
          {items.length === 0 ? (
            <div className="text-center py-12 text-brown-500">
              Check back soon &mdash; list updating.
            </div>
          ) : (
            <div className="rounded-xl border border-tan-200 bg-tan-100 overflow-hidden">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-tan-200 ${
                    i < items.length - 1 ? "border-b border-tan-200" : ""
                  }`}
                >
                  <span className="font-semibold text-brown-900 text-sm">
                    {item.card_label}
                  </span>
                  <span className="text-energy font-medium text-sm ml-4 flex-shrink-0">
                    ${item.buy_rate.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Footer note ──────────────────────────────────── */}
          <p className="mt-4 text-xs text-brown-400 text-center leading-relaxed">
            Buy rates are 70% of current market price. Updated daily.
          </p>

          {updated_at && (
            <p className="mt-2 text-xs text-brown-300 text-center">
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
      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-brown-300">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}
