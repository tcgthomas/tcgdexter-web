import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserDeckCard } from "@/app/components/DeckPostCard";
import { primaryCardImageUrl } from "@/lib/primaryCardImage";
import { deckResult } from "@/lib/shared-matches";
import type { SharedMatchCore } from "@/lib/shared-matches";

interface DeckRow {
  id: string;
  name: string;
  analysis: {
    deckPrice?: number;
    metaMatch?: { archetypeName?: string | null; archetypeId?: string | null };
    rotation?: { ready?: boolean };
    sections?: { pokemon: number; trainer: number; energy: number };
    cards?: Array<{ qty: number; name: string; number: string; setCode: string; section: "pokemon" | "trainer" | "energy" }>;
  } | null;
  updated_at: string;
  like_count: number;
  is_public: boolean;
  cover_image_url: string | null;
}

interface MatchRow {
  saved_deck_id: string | null;
  result: string;
}

export const metadata = {
  title: "My Decks — TCG Dexter",
};

export default async function MyDecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) redirect("/settings");

  const { data: decksRaw } = await supabase
    .from("saved_decks")
    .select("id, name, analysis, updated_at, like_count, is_public, cover_image_url")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const decks = (decksRaw ?? []) as DeckRow[];

  const { data: matchesRaw } = await supabase
    .from("matches")
    .select("saved_deck_id, result");
  const manualMatches = (matchesRaw ?? []) as MatchRow[];

  const { data: sharedRaw } = await supabase
    .from("shared_matches")
    .select(
      `id, creator_user_id, opponent_user_id, creator_decklist_id, opponent_decklist_id,
       creator_result, opponent_result, status, final_outcome, final_winner_user_id,
       judge_ruled, finalized_at`
    )
    .eq("status", "finalized")
    .or(`creator_user_id.eq.${user.id},opponent_user_id.eq.${user.id}`);
  const sharedMatches = (sharedRaw ?? []) as SharedMatchCore[];

  const deckWL = new Map<string, { w: number; l: number; d: number }>();
  for (const m of manualMatches) {
    if (!m.saved_deck_id) continue;
    const prev = deckWL.get(m.saved_deck_id) ?? { w: 0, l: 0, d: 0 };
    if (m.result === "win") prev.w++;
    else if (m.result === "loss") prev.l++;
    else if (m.result === "draw") prev.d++;
    deckWL.set(m.saved_deck_id, prev);
  }
  for (const sm of sharedMatches) {
    const deckId =
      sm.creator_user_id === user.id
        ? sm.creator_decklist_id
        : sm.opponent_decklist_id;
    if (!deckId) continue;
    const r = deckResult(sm, deckId);
    if (!r) continue;
    const prev = deckWL.get(deckId) ?? { w: 0, l: 0, d: 0 };
    if (r === "win") prev.w++;
    else if (r === "loss") prev.l++;
    else prev.d++;
    deckWL.set(deckId, prev);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          My Decks
          {decks.length > 0 && (
            <span className="ml-2 text-base font-normal text-text-muted">
              ({decks.length})
            </span>
          )}
        </h1>
        <Link
          href="/"
          className="text-sm font-semibold px-3 py-1.5 rounded-full bg-black text-white border border-transparent hover:bg-neutral-800 transition-colors"
        >
          + New Deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-8 text-center">
          <p className="text-sm text-text-secondary">
            No decks yet.{" "}
            <Link href="/" className="text-accent hover:underline">
              Create your first deck profile →
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map((deck) => {
            const price = deck.analysis?.deckPrice ?? null;
            const sections = deck.analysis?.sections ?? null;
            const wl = deckWL.get(deck.id) ?? null;
            const imageUrl =
              deck.cover_image_url ??
              primaryCardImageUrl(deck.analysis?.cards ?? []);
            return (
              <UserDeckCard
                key={deck.id}
                id={deck.id}
                name={deck.name}
                href={`/u/${profile.username}/${deck.id}`}
                username={profile.username}
                displayName={profile.display_name}
                price={price}
                counts={sections}
                wl={wl}
                likeCount={deck.like_count}
                isPrivate={!deck.is_public}
                imageUrl={imageUrl}
                ownerUserId={user.id}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
