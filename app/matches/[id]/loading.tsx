import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonLine,
} from "@/app/components/skeletons/Skeleton";

/**
 * Verified match shell. Page chrome (max-width, padding) matches the real
 * route so the skeleton → real swap is layout-stable.
 */
export default function SharedMatchLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="mb-6 space-y-2">
        <SkeletonLine width="w-1/3" height="h-3" />
        <SkeletonLine width="w-2/3" height="h-8" />
      </div>

      <SkeletonCard className="mb-4">
        <div className="space-y-3">
          <SkeletonLine width="w-1/2" height="h-4" />
          <SkeletonBlock height="h-20" />
        </div>
      </SkeletonCard>

      <SkeletonCard>
        <div className="space-y-3">
          <SkeletonLine width="w-1/2" height="h-4" />
          <SkeletonBlock height="h-20" />
        </div>
      </SkeletonCard>
    </main>
  );
}
