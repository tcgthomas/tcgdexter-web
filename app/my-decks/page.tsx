import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SavedDeckRow from "./SavedDeckRow";

/**
 * My Decks — personal library of saved deck profiles.
 *
 * Server component. Redirects to /sign-in if the user isn't authenticated.
 * Renders an empty-state CTA if the user has no saved decks yet.
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

  if (!user) {
    redirect("/sign-in");
  }

  const { data: decks, error } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, notes, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[my-decks] fetch failed:", error);
  }

  // Fetch match counts per deck for inline W-L display + last played
  const { data: matchRows } = await supabase
    .from("matches")
    .select("saved_deck_id, result, played_at")
    .order("played_at", { ascending: false });

  // Aggregate per deck
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
    // Only track lastPlayed from matches that have a user-provided date
    if (m.played_at && !existing.lastPlayed) existing.lastPlayed = m.played_at;
    deckMatchStats.set(m.saved_deck_id, existing);
  }

  const savedDecks = (decks ?? []) as SavedDeck[];

  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="flex-shrink-0 pb-8 px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <div className="flex justify-center mb-4">
          <img
            src="/logo-light.png"
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "360px", height: "auto" }}
          />
        </div>
        <div className="mx-auto max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            My Decks
          </h1>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-lg">
          {savedDecks.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <svg
                className="w-10 h-10 mx-auto text-text-muted mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                No saved decks yet
              </h2>
              <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                Profile a deck on the home page and click Save Deck to start
                your collection.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-light"
              >
                Profile a deck
              </Link>
            </div>
          ) : (
            <div className="rounded-xl bg-surface overflow-hidden">
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
        </div>
      </main>

      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}
