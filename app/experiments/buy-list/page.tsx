import buyListData from "@/data/buy-list.json";
import SectionHeader from "../_design/SectionHeader";

/**
 * Experiment mirror of /buy-list. Same JSON source.
 */

interface BuyListItem {
  card_label: string;
  market_price: number;
}

export default function ExperimentsBuyListPage() {
  const items = (buyListData as { items: BuyListItem[]; updated_at: string }).items;
  const updated_at = (buyListData as { items: BuyListItem[]; updated_at: string }).updated_at;

  return (
    <main className="mx-auto max-w-lg px-6 pt-16 pb-24">
      <div className="text-center mb-8">
        <SectionHeader eyebrow="Bring cash home" title="Buy List" align="center" />
        <p className="mt-3 text-sm text-text-secondary">
          Sell your collection:{" "}
          <a
            href="mailto:trade@tcgdexter.com"
            className="underline hover:text-text-primary"
          >
            trade@tcgdexter.com
          </a>
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          Check back soon &mdash; list updating.
        </div>
      ) : (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#fafafa] ${
                i < items.length - 1 ? "border-b border-black/5" : ""
              }`}
            >
              <span className="font-semibold text-text-primary text-sm">
                {item.card_label}
              </span>
              <span className="text-[#D91E0D] font-medium text-sm ml-4 flex-shrink-0">
                ${item.market_price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {updated_at && (
        <p className="mt-3 text-xs text-text-muted text-center">
          Last updated:{" "}
          {new Date(updated_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </p>
      )}
    </main>
  );
}
