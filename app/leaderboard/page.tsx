import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTierByTitle } from "@/lib/trainer-tiers";
import UnifiedSearch from "./UnifiedSearch";

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

interface TopDeck {
  id: string;
  name: string;
  like_count: number;
  user_id: string;
  analysis: {
    deckPrice?: number;
    metaMatch?: { archetypeName?: string | null };
    rotation?: { ready?: boolean };
  } | null;
  username: string;
  display_name: string;
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

async function fetchTopDecks(): Promise<TopDeck[]> {
  const supabase = await createClient();

  // RLS already enforces is_public + owner profile is_public
  const { data: decks } = await supabase
    .from("saved_decks")
    .select("id, name, like_count, user_id, analysis")
    .eq("is_public", true)
    .order("like_count", { ascending: false })
    .limit(10);

  if (!decks?.length) return [];

  const userIds = Array.from(new Set(decks.map((d) => d.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", userIds)
    .eq("is_public", true)
    .not("username", "is", null);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return decks
    .map((d) => {
      const profile = profileMap.get(d.user_id);
      if (!profile) return null;
      return { ...d, username: profile.username, display_name: profile.display_name };
    })
    .filter(Boolean) as TopDeck[];
}

export default async function LeaderboardPage() {
  const [trainers, topDecks] = await Promise.all([fetchLeaderboard(), fetchTopDecks()]);
  const top3 = trainers.slice(0, 3);

  const rankMedal = ["🥇", "🥈", "🥉"];

  return (
    <main className="mx-auto max-w-2xl px-6 pt-10 pb-32">
      {/* Header */}
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
        <div className="mt-6">
          <UnifiedSearch />
        </div>
      </div>

      {/* Top 3 list */}
      {top3.length > 0 && (
        <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden mb-8">
          {top3.map((trainer, i) => {
            const tier = getTierByTitle(trainer.trainer_title ?? "Rookie Trainer");
            return (
              <Link
                key={trainer.id}
                href={`/u/${trainer.username}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-black/[0.02] transition border-b border-black/5 last:border-b-0"
              >
                <span className="text-xl w-7 flex-shrink-0">{rankMedal[i]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary truncate">{trainer.display_name}</div>
                </div>
                <div className={`hidden sm:flex text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${tier.color} ${tier.borderColor} ${tier.bgColor}`}>
                  {tier.title}
                </div>
                <div className="text-xs text-text-muted flex-shrink-0">
                  <span className="font-semibold tabular-nums text-text-primary">{trainer.totalLikes}</span> likes
                  {" · "}
                  <span className="font-semibold tabular-nums text-text-primary">{trainer.deckCount}</span> decks
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

      {/* Top Decks */}
      {topDecks.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-sm font-semibold text-text-muted">Top decks</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
            {topDecks.map((deck, i) => {
              const archetype = deck.analysis?.metaMatch?.archetypeName ?? null;
              const price = deck.analysis?.deckPrice ?? null;
              const standard = deck.analysis?.rotation?.ready ?? null;
              return (
                <Link
                  key={deck.id}
                  href={`/u/${deck.username}/${deck.id}`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-colors ${
                    i === topDecks.length - 1 ? "" : "border-b border-bg"
                  }`}
                >
                  <span className="flex-shrink-0 w-5 text-right text-sm font-semibold text-text-muted tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-base truncate">{deck.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted flex-wrap">
                      {archetype && <span className="truncate">{archetype}</span>}
                      {price !== null && price > 0 && (
                        <>
                          {archetype && <span>·</span>}
                          <span className="tabular-nums">${price.toFixed(2)}</span>
                        </>
                      )}
                      {standard === true && (
                        <>
                          {(archetype || (price !== null && price > 0)) && <span>·</span>}
                          <span>Standard</span>
                        </>
                      )}
                      <span>·</span>
                      <span>@{deck.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-text-muted tabular-nums flex-shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    {deck.like_count}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
