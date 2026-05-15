import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import SharedMatchClient, { type ClientMatch } from "./SharedMatchClient";

export const metadata: Metadata = {
  title: "Verified Match — TCG Dexter",
};

interface DeckSlim {
  id: string;
  name: string;
  archetype: string | null;
}

interface PlayerSlim {
  id: string;
  display_name: string;
  username: string;
}

export default async function SharedMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/matches/${id}`);

  const { data: match } = await supabase
    .from("shared_matches")
    .select(
      `id, code, creator_user_id, creator_decklist_id, creator_result,
       opponent_user_id, opponent_decklist_id, opponent_result,
       status, final_outcome, final_winner_user_id, judge_ruled,
       expires_at, finalized_at, created_at`
    )
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const isCreator = match.creator_user_id === user.id;
  const isOpponent = match.opponent_user_id === user.id;
  if (!isCreator && !isOpponent) {
    // Non-participants only see finalized matches via the public profile,
    // not the live detail page.
    notFound();
  }

  // Fetch participant profiles + decks
  const userIds = [match.creator_user_id, match.opponent_user_id].filter(
    Boolean
  ) as string[];
  const deckIds = [match.creator_decklist_id, match.opponent_decklist_id].filter(
    Boolean
  ) as string[];

  const [{ data: profilesRaw }, { data: decksRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", userIds),
    supabase
      .from("saved_decks")
      .select("id, name, analysis")
      .in("id", deckIds),
  ]);

  const profileById = new Map<string, PlayerSlim>();
  for (const p of profilesRaw ?? []) {
    profileById.set(p.id, {
      id: p.id,
      display_name: p.display_name,
      username: p.username,
    });
  }
  const deckById = new Map<string, DeckSlim>();
  for (const d of decksRaw ?? []) {
    deckById.set(d.id, {
      id: d.id,
      name: d.name,
      archetype:
        ((d.analysis as { metaMatch?: { archetypeName?: string | null } } | null)
          ?.metaMatch?.archetypeName) ?? null,
    });
  }

  const creator = profileById.get(match.creator_user_id);
  const creatorDeck = deckById.get(match.creator_decklist_id);
  const opponent = match.opponent_user_id
    ? profileById.get(match.opponent_user_id) ?? null
    : null;
  const opponentDeck = match.opponent_decklist_id
    ? deckById.get(match.opponent_decklist_id) ?? null
    : null;

  if (!creator || !creatorDeck) notFound();

  const clientMatch: ClientMatch = {
    id: match.id,
    code: match.code,
    status: match.status,
    creator,
    creator_deck: creatorDeck,
    creator_result: match.creator_result,
    opponent,
    opponent_deck: opponentDeck,
    opponent_result: match.opponent_result,
    final_outcome: match.final_outcome,
    final_winner_user_id: match.final_winner_user_id,
    judge_ruled: match.judge_ruled,
    expires_at: match.expires_at,
    finalized_at: match.finalized_at,
  };

  return <SharedMatchClient match={clientMatch} viewerId={user.id} />;
}
