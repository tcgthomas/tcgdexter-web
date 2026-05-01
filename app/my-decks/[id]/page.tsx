import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { type AnalysisResult } from "@/app/components/DeckProfileView";
import archetypesRaw from "@/data/meta-archetypes.json";
import MyDeckClient from "@/app/my-decks/[id]/MyDeckClient";

/**
 * Private saved-deck detail view. Runs server-side auth + data fetch,
 * then delegates rendering to MyDeckClient.
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

  if (!user) redirect("/sign-in");

  const { data: deck } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, notes, updated_at, is_public")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!deck) notFound();

  // Owner username powers the canonical share URL when the deck is public.
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  // Build the canonical /u/[username]/[deckId] URL on the server so it's
  // hydration-stable. MyDeckClient decides at render time whether to surface
  // it (only when the deck is currently public).
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "tcgdexter.com";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const canonicalShareUrl = ownerProfile?.username
    ? `${proto}://${host}/u/${ownerProfile.username}/${deck.id}`
    : null;

  const analysis = deck.analysis as AnalysisResult | null;
  if (!analysis) redirect("/my-decks");

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
    redirect(slug ? `/meta-decks/${slug}` : "/my-decks");
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
    <MyDeckClient
      savedDeckId={deck.id}
      deckList={deck.deck_list}
      analysis={analysis}
      initialMatches={matches}
      initialNotes={deck.notes ?? ""}
      pageTitle={deck.name}
      profiledAt={deck.updated_at}
      initialIsPublic={deck.is_public ?? false}
      canonicalShareUrl={canonicalShareUrl}
    />
  );
}
