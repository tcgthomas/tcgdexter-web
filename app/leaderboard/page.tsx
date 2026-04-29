import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTierByTitle } from "@/lib/trainer-tiers";
import TrainerSearch from "./TrainerSearch";

export const revalidate = 300; // 5-minute cache

interface ProfileRow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  trainer_title: string | null;
}

interface DeckRow {
  user_id: string;
  like_count: number;
}

async function fetchLeaderboard(): Promise<Array<ProfileRow & { totalLikes: number; deckCount: number }>> {
  const supabase = await createClient();

  // Fetch all public decks (minimal columns) — RLS enforces is_public + owner is_public
  const { data: decks } = await supabase
    .from("saved_decks")
    .select("user_id, like_count")
    .eq("is_public", true);

  if (!decks?.length) return [];

  // Aggregate per user
  const totals = new Map<string, { totalLikes: number; deckCount: number }>();
  for (const d of decks as DeckRow[]) {
    const prev = totals.get(d.user_id) ?? { totalLikes: 0, deckCount: 0 };
    totals.set(d.user_id, {
      totalLikes: prev.totalLikes + (d.like_count ?? 0),
      deckCount: prev.deckCount + 1,
    });
  }

  // Top 20 by likes
  const topIds = Array.from(totals.entries())
    .sort((a, b) => b[1].totalLikes - a[1].totalLikes)
    .slice(0, 20)
    .map(([id]) => id);

  if (!topIds.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, trainer_title")
    .in("id", topIds)
    .eq("is_public", true)
    .not("username", "is", null);

  if (!profiles?.length) return [];

  return (profiles as ProfileRow[])
    .map((p) => ({ ...p, ...(totals.get(p.id) ?? { totalLikes: 0, deckCount: 0 }) }))
    .sort((a, b) => b.totalLikes - a.totalLikes);
}

export default async function LeaderboardPage() {
  const trainers = await fetchLeaderboard();
  const top3 = trainers.slice(0, 3);
  const rest = trainers.slice(3);

  const rankMedal = ["🥇", "🥈", "🥉"];

  return (
    <main className="mx-auto max-w-4xl px-6 pt-10 pb-32">
      {/* Header */}
      <div className="mb-10">
        <div className="text-xs uppercase tracking-widest text-[#D91E0D] mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff8a3d] opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff8a3d]" />
          </span>
          Live leaderboard
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">Top Trainers.</h1>
        <p className="mt-3 text-base text-text-secondary max-w-lg">
          Ranked by total deck likes. Find established players and browse their public collections.
        </p>
      </div>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {top3.map((trainer, i) => {
            const tier = getTierByTitle(trainer.trainer_title ?? "Rookie Trainer");
            return (
              <Link key={trainer.id} href={`/u/${trainer.username}`}>
                <div className="rounded-xl border border-black/8 bg-white p-5 shadow-sm hover:shadow-md hover:bg-white/90 transition h-full flex flex-col items-center text-center gap-3">
                  <div className="text-2xl">{rankMedal[i]}</div>
                  {trainer.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trainer.avatar_url}
                      alt={trainer.display_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-black/8"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-black/[0.06] flex items-center justify-center text-2xl font-semibold text-text-muted">
                      {trainer.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-text-primary leading-tight">{trainer.display_name}</div>
                    <div className="text-xs text-text-muted mt-0.5">@{trainer.username}</div>
                  </div>
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tier.color} ${tier.borderColor} ${tier.bgColor}`}>
                    {tier.title}
                  </div>
                  <div className="mt-auto pt-2 border-t border-black/5 w-full grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-lg font-semibold tabular-nums text-text-primary">{trainer.totalLikes}</div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide">likes</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold tabular-nums text-text-primary">{trainer.deckCount}</div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide">decks</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Ranks 4–20 */}
      {rest.length > 0 && (
        <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden mb-12">
          {rest.map((trainer, i) => {
            const tier = getTierByTitle(trainer.trainer_title ?? "Rookie Trainer");
            return (
              <Link key={trainer.id} href={`/u/${trainer.username}`} className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition border-b border-black/5 last:border-b-0">
                <span className="w-6 text-sm font-mono text-text-muted text-right flex-shrink-0">#{i + 4}</span>
                {trainer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trainer.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-black/[0.06] flex items-center justify-center text-sm font-semibold text-text-muted flex-shrink-0">
                    {trainer.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary truncate">{trainer.display_name}</div>
                  <div className="text-xs text-text-muted">@{trainer.username}</div>
                </div>
                <div className={`hidden sm:block text-xs font-semibold px-2 py-0.5 rounded-full border ${tier.color} ${tier.borderColor} ${tier.bgColor}`}>
                  {tier.title}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-text-primary">{trainer.totalLikes}</div>
                  <div className="text-[10px] text-text-muted">likes</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {trainers.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-sm">No public decks yet. Be the first to share yours!</p>
        </div>
      )}

      {/* Search divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-black/10" />
        <span className="text-sm font-semibold text-text-muted">Find a trainer</span>
        <div className="flex-1 h-px bg-black/10" />
      </div>

      <TrainerSearch />
    </main>
  );
}
