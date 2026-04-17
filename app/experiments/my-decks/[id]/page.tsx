import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type AnalysisResult } from "@/app/components/DeckProfileView";
import archetypesRaw from "@/data/meta-archetypes.json";
import MyDeckClient from "@/app/my-decks/[id]/MyDeckClient";

/**
 * Experiment mirror of /my-decks/[id]. Same server-side fetch + auth
 * checks, delegates rendering to the prod MyDeckClient (wrapped by our
 * /experiments shell via layout.tsx).
 */
export default async function ExperimentsMyDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/experiments/sign-in");

  const { data: deck } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, notes, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!deck) notFound();

  const analysis = deck.analysis as AnalysisResult | null;
  if (!analysis) redirect("/experiments/my-decks");

  const analysisAny = analysis as unknown as Record<string, unknown>;
  if (!("deckSize" in analysisAny)) {
    const metaMatch = analysisAny.metaMatch as
      | { archetypeId?: string; archetypeName?: string }
      | undefined;
    const slug =
      metaMatch?.archetypeId ??
      (archetypesRaw as { id: string; name: string }[]).find(
        (a) => a.name === metaMatch?.archetypeName,
      )?.id;
    redirect(slug ? `/experiments/meta-decks/${slug}` : "/experiments/my-decks");
  }

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
    <main className="px-6 pt-12 pb-24">
      <MyDeckClient
        savedDeckId={deck.id}
        deckList={deck.deck_list}
        analysis={analysis}
        initialMatches={matches}
        initialNotes={deck.notes ?? ""}
        pageTitle={deck.name}
        profiledAt={deck.updated_at}
      />
    </main>
  );
}
