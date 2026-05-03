import { SkeletonBlock, SkeletonLine } from "./Skeleton";

const CARD_CLS =
  "rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm";

/**
 * Mirrors the DeckProfileView layout:
 *   - Header block (title placeholder)
 *   - Overview card (matrix grid + legend)
 *   - Price module card
 *   - Save/Share button row
 *   - 3 collapsible section cards
 *
 * Sized to match real module heights so the swap is jump-free.
 */
export default function DeckProfileSkeleton() {
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-[calc(env(safe-area-inset-top)_+_1.75rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-8">
        <div className="mx-auto max-w-2xl space-y-3">
          <SkeletonLine width="w-2/3" height="h-9" />
          <SkeletonLine width="w-1/3" height="h-3" />
        </div>
      </header>

      {/* Modules */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {/* Overview */}
          <div className={`${CARD_CLS} p-5`}>
            <div className="flex items-baseline justify-between mb-5">
              <SkeletonLine width="w-24" height="h-5" />
            </div>
            <div className="grid grid-cols-12 gap-1.5 mb-5">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-md bg-black/5 animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-black/5 pt-4">
              <SkeletonLine width="w-20" height="h-3" />
              <SkeletonLine width="w-20" height="h-3" />
              <SkeletonLine width="w-20" height="h-3" />
            </div>
          </div>

          {/* Price module */}
          <div className={`${CARD_CLS} p-5`}>
            <SkeletonLine width="w-32" height="h-4" className="mb-3" />
            <SkeletonLine width="w-24" height="h-7" />
          </div>

          {/* Save + Share buttons row */}
          <div className="flex gap-3">
            <SkeletonBlock height="h-10" className="flex-1 rounded-full" />
            <SkeletonBlock height="h-10" className="flex-1 rounded-full" />
          </div>

          {/* Collapsible sections */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${CARD_CLS} p-5`}>
              <div className="flex items-center justify-between">
                <SkeletonLine width="w-28" height="h-5" />
                <SkeletonLine width="w-4" height="h-4" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
