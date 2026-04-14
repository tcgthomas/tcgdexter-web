import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type AnalysisResult } from "@/app/components/DeckProfileView";
import archetypesRaw from "@/data/meta-archetypes.json";
import MyDeckClient from "./MyDeckClient";

/**
 * Private saved-deck detail view.
 *
 * Fetches deck + match data server-side, then delegates all rendering and
 * interactive state to MyDeckClient.
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

  return (
    <MyDeckClient
      savedDeckId={deck.id}
      deckList={deck.deck_list}
      analysis={analysis}
      initialMatches={matches}
      initialNotes={deck.notes ?? ""}
      pageTitle={deck.name}
      profiledAt={deck.updated_at}
    />
  );
}
