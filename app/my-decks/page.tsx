import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SavedDeckRow from "@/app/my-decks/SavedDeckRow";
import SectionHeader from "@/app/components/_design/SectionHeader";

/**
 * Experiment mirror of /my-decks — same server-side auth + query logic,
 * rendered inside the new shell. Reuses the prod SavedDeckRow component.
 */

interface SavedDeck {
  id: string;
  name: string;
  deck_list: string;
  analysis: {
    deckPrice?: number;
    metaMatch?: { archetypeName?: string | null };
    rotation?: { ready?: boolean };
  } | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default async function MyDecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: decks, error } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, notes, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) console.error("[experiments/my-decks] fetch failed:", error);

  const { data: matchRows } = await supabase
    .from("matches")
    .select("saved_deck_id, result, played_at")
    .order("played_at", { ascending: false });

  const deckMatchStats = new Map<
    string,
    { wins: number; losses: number; draws: number; lastPlayed: string | null }
  >();
  for (const m of matchRows ?? []) {
    const existing = deckMatchStats.get(m.saved_deck_id) ?? {
      wins: 0, losses: 0, draws: 0, lastPlayed: null,
    };
    if (m.result === "win") existing.wins++;
    else if (m.result === "loss") existing.losses++;
    else if (m.result === "draw") existing.draws++;
    if (m.played_at && !existing.lastPlayed) existing.lastPlayed = m.played_at;
    deckMatchStats.set(m.saved_deck_id, existing);
  }

  const savedDecks = (decks ?? []) as SavedDeck[];

  return (
    <main className="mx-auto max-w-2xl px-6 pt-16 pb-24">
      <div className="mb-8">
        <SectionHeader eyebrow="Your library" title="My Decks" />
      </div>

      {savedDecks.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-10 text-center">
          <svg
            className="w-10 h-10 mx-auto text-text-muted mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No saved decks yet</h2>
          <p className="text-sm text-text-secondary mb-5 leading-relaxed">
            Profile a deck on the home page and click Save Deck to start your collection.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#D91E0D]/30 hover:shadow-[#D91E0D]/50 transition"
          >
            Profile a deck
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
          {savedDecks.map((deck, i) => {
            const stats = deckMatchStats.get(deck.id);
            return (
              <SavedDeckRow
                key={deck.id}
                deck={deck}
                isLast={i === savedDecks.length - 1}
                matchStats={stats ?? null}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
