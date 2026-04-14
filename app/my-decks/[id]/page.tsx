import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeckProfileView, {
  type AnalysisResult,
} from "@/app/components/DeckProfileView";
import archetypesRaw from "@/data/meta-archetypes.json";
import CopyDeckListButton from "@/app/components/CopyDeckListButton";
import QRCodeButton from "@/app/components/QRCodeButton";
import DeckNotes from "./DeckNotes";
import MatchLog from "./MatchLog";

/**
 * Private saved-deck detail view.
 *
 * Renders the full deck profile, plus owner-only sections: Notes (auto-save
 * textarea) and Match Log (structured match history with inline logging).
 */
export default async function MyDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: deck } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, notes, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!deck) {
    notFound();
  }

  const analysis = deck.analysis as AnalysisResult | null;
  if (!analysis) {
    redirect("/my-decks");
  }

  // Meta decks are saved with a partial stub (only metaMatch, no deckSize).
  // DeckProfileView requires a full AnalysisResult — redirect to the meta deck
  // page instead of crashing.
  const analysisAny = analysis as unknown as Record<string, unknown>;
  if (!("deckSize" in analysisAny)) {
    const metaMatch = analysisAny.metaMatch as
      | { archetypeId?: string; archetypeName?: string }
      | undefined;
    const slug =
      metaMatch?.archetypeId ??
      (archetypesRaw as { id: string; name: string }[]).find(
        (a) => a.name === metaMatch?.archetypeName
      )?.id;
    redirect(slug ? `/meta-decks/${slug}` : "/my-decks");
  }

  // Fetch match history for this deck
  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, result, opponent_name, opponent_archetype, opponent_deck_list, notes, played_at")
    .eq("saved_deck_id", id)
    .order("played_at", { ascending: false });

  const matches = (matchRows ?? []) as Array<{
    id: string;
    result: "win" | "loss" | "draw";
    opponent_name: string | null;
    opponent_archetype: string | null;
    opponent_deck_list: string | null;
    notes: string | null;
    played_at: string;
  }>;

  const updatedStr = new Date(deck.updated_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DeckProfileView
      deckList={deck.deck_list}
      analysis={analysis}
      profiledAt={deck.updated_at}
      pageTitle={deck.name}
      subtitle={
        <div className="flex items-center gap-2">
          <CopyDeckListButton deckList={deck.deck_list} />
          <QRCodeButton deckList={deck.deck_list} analysis={analysis} />
        </div>
      }
      hideSave
      topSlot={
        <>
          <MatchLog savedDeckId={deck.id} initialMatches={matches} />
          <DeckNotes savedDeckId={deck.id} initialNotes={deck.notes ?? ""} />
        </>
      }
      footerCta={
        <Link
          href="/my-decks"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:bg-surface-2"
        >
          Back to My Decks
        </Link>
      }
    />
  );
}
