import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTierByTitle } from "@/lib/trainer-tiers";
import MatchHeatMap from "@/app/profile/MatchHeatMap";

interface ProfileRow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  trainer_title: string | null;
  created_at: string;
  is_public: boolean;
}

interface DeckRow {
  id: string;
  name: string;
  analysis: {
    deckPrice?: number;
    metaMatch?: { archetypeName?: string | null };
    rotation?: { ready?: boolean };
  } | null;
  updated_at: string;
  like_count: number;
  is_public: boolean;
}

interface MatchRow {
  saved_deck_id: string | null;
  result: string;
  played_at: string | null;
  created_at: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username, bio, is_public")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();
  if (!data) return { title: "Trainer Not Found — TCG Dexter" };
  const title = `${data.display_name} (@${data.username}) — TCG Dexter`;
  const description = data.bio?.trim() || `Public deck collection by ${data.display_name}.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, trainer_title, created_at, is_public")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const isOwner = viewer?.id === profile.id;

  if (!isOwner && !profile.is_public) notFound();

  const { data: decksRaw } = isOwner
    ? await supabase
        .from("saved_decks")
        .select("id, name, analysis, updated_at, like_count, is_public")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
    : await supabase
        .from("saved_decks")
        .select("id, name, analysis, updated_at, like_count, is_public")
        .eq("user_id", profile.id)
        .eq("is_public", true)
        .order("like_count", { ascending: false })
        .order("updated_at", { ascending: false });
  const decks = (decksRaw ?? []) as DeckRow[];

  let matchStats: MatchRow[] = [];
  if (isOwner) {
    const { data: matches } = await supabase
      .from("matches")
      .select("saved_deck_id, result, played_at, created_at");
    matchStats = (matches ?? []) as MatchRow[];
  }

  const deckWL = new Map<string, { w: number; l: number; d: number }>();
  for (const m of matchStats) {
    if (!m.saved_deck_id) continue;
    const prev = deckWL.get(m.saved_deck_id) ?? { w: 0, l: 0, d: 0 };
    if (m.result === "win") prev.w++;
    else if (m.result === "loss") prev.l++;
    else if (m.result === "draw") prev.d++;
    deckWL.set(m.saved_deck_id, prev);
  }

  const globalWins = matchStats.filter((m) => m.result === "win").length;
  const globalLosses = matchStats.filter((m) => m.result === "loss").length;
  const globalDraws = matchStats.filter((m) => m.result === "draw").length;
  const globalTotal = globalWins + globalLosses + globalDraws;

  const tier = getTierByTitle(profile.trainer_title ?? "Rookie Trainer");
  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      {/* Profile module */}
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-14 h-14 rounded-full object-cover border border-black/10"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center text-xl font-bold text-text-secondary border border-black/10">
                {profile.display_name.trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-text-primary leading-tight truncate">
                  {profile.display_name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm text-text-muted">@{profile.username}</span>
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${tier.color} ${tier.borderColor} ${tier.bgColor}`}
                  >
                    {tier.title}
                  </span>
                </div>
              </div>
              {isOwner && (
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm text-text-secondary leading-relaxed mt-2 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 text-xs text-text-muted flex-wrap">
              {globalTotal > 0 && (
                <>
                  <span>
                    <span className="font-semibold text-emerald-700">{globalWins}W</span>
                    {" · "}
                    <span className="font-semibold text-rose-700">{globalLosses}L</span>
                    {globalDraws > 0 && (
                      <>
                        {" · "}
                        <span className="font-semibold text-stone-600">{globalDraws}D</span>
                      </>
                    )}
                  </span>
                  <span>·</span>
                </>
              )}
              <span>Joined {joinedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match heatmap — only for owner (match data is private) */}
      {isOwner && matchStats.length > 0 && (
        <MatchHeatMap matches={matchStats} />
      )}

      {/* Deck feed */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-3 px-1">
          Decks
          {decks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-text-muted">({decks.length})</span>
          )}
        </h2>

        {decks.length === 0 ? (
          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-8 text-center">
            <p className="text-sm text-text-secondary">
              {isOwner ? (
                <>
                  No decks yet.{" "}
                  <Link href="/" className="text-accent hover:underline">
                    Create your first profile →
                  </Link>
                </>
              ) : (
                <>{profile.display_name} hasn&apos;t shared any decks yet.</>
              )}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
            {decks.map((deck, i) => {
              const archetype = deck.analysis?.metaMatch?.archetypeName ?? null;
              const price = deck.analysis?.deckPrice ?? null;
              const standard = deck.analysis?.rotation?.ready ?? null;
              const wl = deckWL.get(deck.id);
              return (
                <Link
                  key={deck.id}
                  href={`/u/${profile.username}/${deck.id}`}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-colors ${
                    i === decks.length - 1 ? "" : "border-b border-bg"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-base truncate">
                      {deck.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted flex-wrap">
                      {archetype && <span className="truncate max-w-[160px]">{archetype}</span>}
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
                      {isOwner && wl && wl.w + wl.l + wl.d > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-emerald-700">{wl.w}W</span>
                          {" "}
                          <span className="font-semibold text-rose-700">{wl.l}L</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {deck.like_count > 0 && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-text-muted tabular-nums">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                        {deck.like_count}
                      </div>
                    )}
                    {isOwner && !deck.is_public && (
                      <svg
                        className="w-3.5 h-3.5 text-text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                    )}
                    <svg
                      className="w-4 h-4 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
