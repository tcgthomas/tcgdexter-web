import { SkeletonRow } from "./Skeleton";

/**
 * Mirrors the structure of /leaderboard:
 *   - Top 3 trainers in a card
 *   - Divider
 *   - Top decks list in a card
 * Header + UnifiedSearch are rendered as real chrome by the loading.tsx,
 * so this only fills the data-driven sections.
 */
export default function LeaderboardSkeleton() {
  return (
    <>
      <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={i < 2 ? "border-b border-black/5" : ""}
          >
            <SkeletonRow />
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-sm font-semibold text-text-muted">Top decks</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>

        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={i < 4 ? "border-b border-bg" : ""}
            >
              <SkeletonRow />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
