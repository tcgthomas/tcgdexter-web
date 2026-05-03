import { SkeletonLine } from "./Skeleton";

/**
 * Stand-in for the StatsStrip on the home page (decks-profiled / matches-logged).
 * Two stat tiles in a row.
 */
export default function HomeStatsSkeleton() {
  return (
    <div className="flex items-center justify-center gap-12">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <SkeletonLine width="w-16" height="h-8" />
          <SkeletonLine width="w-24" height="h-3" />
        </div>
      ))}
    </div>
  );
}
