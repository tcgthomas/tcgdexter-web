import LeaderboardSkeleton from "@/app/components/skeletons/LeaderboardSkeleton";

/**
 * Leaderboard shell. Header is real chrome (no data needed); trainer + deck
 * lists are skeletons until the server query resolves. Width and padding
 * mirror /leaderboard exactly so the skeleton → real swap is jump-free.
 */
export default function LeaderboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-10 pb-32">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-accent mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff8a3d] opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff8a3d]" />
          </span>
          Live leaderboard
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">Top Trainers</h1>
        <p className="mt-3 text-base text-text-secondary max-w-lg">
          Ranked by total deck likes. Find established players and browse their public collections.
        </p>
      </div>

      <LeaderboardSkeleton />
    </main>
  );
}
