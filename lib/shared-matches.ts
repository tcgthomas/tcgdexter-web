// Pure helpers for the verified shared matches feature. No Supabase, no React —
// safe to import from server components, route handlers, and client components
// alike.

export type SharedResult = "win" | "loss" | "draw";
export type SharedStatus = "pending" | "finalized" | "conflict" | "under_review";
export type SharedOutcome = "creator_win" | "opponent_win" | "draw";

export interface SharedMatchCore {
  id: string;
  creator_user_id: string;
  opponent_user_id: string | null;
  creator_decklist_id: string;
  opponent_decklist_id: string | null;
  creator_result: SharedResult | null;
  opponent_result: SharedResult | null;
  status: SharedStatus;
  final_outcome: SharedOutcome | null;
  final_winner_user_id: string | null;
  judge_ruled: boolean;
  finalized_at?: string | null;
}

/**
 * Given the two submitted results, decide the next state of the match.
 * Returns null when nothing should change yet (one side still hasn't
 * submitted).
 */
export function deriveTransition(
  creator: SharedResult | null,
  opponent: SharedResult | null
): { status: SharedStatus; outcome: SharedOutcome | null } | null {
  if (!creator || !opponent) return null;

  if (creator === "draw" && opponent === "draw") {
    return { status: "finalized", outcome: "draw" };
  }
  if (creator === "win" && opponent === "loss") {
    return { status: "finalized", outcome: "creator_win" };
  }
  if (creator === "loss" && opponent === "win") {
    return { status: "finalized", outcome: "opponent_win" };
  }
  // Anything else (both win, both loss, draw + win/loss) is a conflict.
  return { status: "conflict", outcome: null };
}

export function winnerUserIdFromOutcome(
  match: Pick<SharedMatchCore, "creator_user_id" | "opponent_user_id">,
  outcome: SharedOutcome | null
): string | null {
  if (!outcome || outcome === "draw") return null;
  return outcome === "creator_win" ? match.creator_user_id : match.opponent_user_id;
}

/**
 * For a given viewer, did they lose this match? Used to decide whether to
 * show the "result determined by a judge" note. Winners and visitors do
 * not see the note.
 */
export function viewerLost(match: SharedMatchCore, viewerId: string | null): boolean {
  if (!viewerId) return false;
  if (match.status !== "finalized" || !match.final_outcome) return false;
  if (match.final_outcome === "draw") return false;
  if (match.final_winner_user_id === viewerId) return false;
  return match.creator_user_id === viewerId || match.opponent_user_id === viewerId;
}

/**
 * Resolve a viewer-perspective result: did this viewer win, lose, or draw
 * this finalized match? Returns null if not finalized or viewer not a
 * participant.
 */
export function viewerResult(
  match: SharedMatchCore,
  viewerId: string | null
): SharedResult | null {
  if (match.status !== "finalized" || !match.final_outcome) return null;
  if (match.final_outcome === "draw") return "draw";
  if (!viewerId) return null;
  if (match.creator_user_id !== viewerId && match.opponent_user_id !== viewerId) {
    return null;
  }
  return match.final_winner_user_id === viewerId ? "win" : "loss";
}

/**
 * Given a finalized match and a deck id (the deck profile being viewed),
 * return win/loss/draw from the perspective of *that deck's owner*.
 * Used to compute per-deck W-L from shared_matches rows.
 */
export function deckResult(
  match: SharedMatchCore,
  deckId: string
): SharedResult | null {
  if (match.status !== "finalized" || !match.final_outcome) return null;
  if (match.final_outcome === "draw") return "draw";

  const isCreatorDeck = match.creator_decklist_id === deckId;
  const isOpponentDeck = match.opponent_decklist_id === deckId;
  if (!isCreatorDeck && !isOpponentDeck) return null;

  const creatorWon = match.final_outcome === "creator_win";
  if (isCreatorDeck) return creatorWon ? "win" : "loss";
  return creatorWon ? "loss" : "win";
}
