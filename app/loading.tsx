import HomeStatsSkeleton from "@/app/components/skeletons/HomeStatsSkeleton";

/**
 * Home loading shell. Mirrors the hero outline so the page anchors visually
 * before HomeClient hydrates with stats + top trainers.
 *
 * The deck-input form is a client island that needs hydration, so we don't
 * try to render it here — a card-shaped placeholder stands in until the real
 * page arrives.
 */
export default function HomeLoading() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-[1.925rem] md:pt-14 pb-16 text-center">
        <div className="flex justify-center mb-7 md:mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-light.png"
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "240px", height: "auto" }}
          />
        </div>

        <h1 className="text-3xl md:text-7xl font-semibold tracking-tight leading-[1.02] max-w-4xl mx-auto">
          The deckbuilder&apos;s
          <br />
          <span className="bg-gradient-brand bg-clip-text text-transparent">
            dex for Pokémon TCG.
          </span>
        </h1>

        {/* Deck input placeholder */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-brand opacity-30 blur-xl" />
            <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-black/5 p-2 shadow-brand-lg">
              <div className="h-64 rounded-xl bg-black/5 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="mx-auto max-w-2xl px-6 pb-24">
        <HomeStatsSkeleton />
      </section>
    </>
  );
}
