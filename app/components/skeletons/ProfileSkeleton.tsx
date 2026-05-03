import { SkeletonCircle, SkeletonLine, SkeletonRow } from "./Skeleton";

/**
 * Mirrors /u/[username]:
 *   - Profile card (badge + name + meta)
 *   - Heatmap shell (only shown for owners IRL — we always render it
 *     here to avoid layout flicker; visitor pages overwrite it)
 *   - Decks header + 3 deck rows
 */
export default function ProfileSkeleton() {
  return (
    <>
      {/* Profile module */}
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5 mb-6">
        <div className="flex items-start gap-4">
          <SkeletonCircle size="w-14 h-14" />
          <div className="flex-1 min-w-0 space-y-2">
            <SkeletonLine width="w-40" height="h-5" />
            <SkeletonLine width="w-28" height="h-3" />
            <SkeletonLine width="w-56" height="h-3" />
          </div>
        </div>
      </div>

      {/* Decks header */}
      <div className="mt-6">
        <div className="px-1 mb-3">
          <SkeletonLine width="w-20" height="h-5" />
        </div>

        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={i < 2 ? "border-b border-bg" : ""}>
              <SkeletonRow showBadge={false} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
