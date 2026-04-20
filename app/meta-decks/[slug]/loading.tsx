/**
 * Skeleton shown instantly while a meta archetype page fetches — prevents
 * the white flash between /meta-decks and the archetype detail view.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col bg-bg animate-pulse">
      <header className="flex-shrink-0 px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-4">
        <div className="mx-auto max-w-2xl">
          <div className="h-9 sm:h-10 w-2/3 rounded-md bg-black/8" />
        </div>
      </header>
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          <div className="h-4 w-32 rounded bg-black/5" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl border border-black/8 bg-white/60" />
            <div className="h-24 rounded-2xl border border-black/8 bg-white/60" />
            <div className="h-24 rounded-2xl border border-black/8 bg-white/60" />
            <div className="h-24 rounded-2xl border border-black/8 bg-white/60" />
          </div>
          <div className="h-32 rounded-2xl border border-black/8 bg-white/60" />
          <div className="h-40 rounded-2xl border border-black/8 bg-white/60" />
        </div>
      </main>
    </div>
  );
}
