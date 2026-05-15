"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type SharedResult,
  type SharedStatus,
  type SharedOutcome,
  viewerLost,
} from "@/lib/shared-matches";

interface PlayerSlim {
  id: string;
  display_name: string;
  username: string;
}

interface DeckSlim {
  id: string;
  name: string;
  archetype: string | null;
}

export interface ClientMatch {
  id: string;
  code: string | null;
  status: SharedStatus;
  creator: PlayerSlim;
  creator_deck: DeckSlim;
  creator_result: SharedResult | null;
  opponent: PlayerSlim | null;
  opponent_deck: DeckSlim | null;
  opponent_result: SharedResult | null;
  final_outcome: SharedOutcome | null;
  final_winner_user_id: string | null;
  judge_ruled: boolean;
  expires_at: string;
  finalized_at: string | null;
}

interface Props {
  match: ClientMatch;
  viewerId: string;
}

export default function SharedMatchClient({ match, viewerId }: Props) {
  const router = useRouter();
  const isCreator = match.creator.id === viewerId;
  const myResult = isCreator ? match.creator_result : match.opponent_result;
  const theirResult = isCreator ? match.opponent_result : match.creator_result;
  const me = isCreator ? match.creator : match.opponent;
  const them = isCreator ? match.opponent : match.creator;
  const myDeck = isCreator ? match.creator_deck : match.opponent_deck;
  const theirDeck = isCreator ? match.opponent_deck : match.creator_deck;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Refresh on focus so each player sees the latest state when they
  // come back to the tab.
  useEffect(() => {
    function onFocus() {
      router.refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  async function submitResult(result: SharedResult) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/shared/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!match.code) return;
    try {
      await navigator.clipboard.writeText(match.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy automatically — select the code and copy manually.");
    }
  }

  async function shareCode() {
    if (!match.code || !navigator.share) return copyCode();
    try {
      await navigator.share({
        title: "TCG Dexter match code",
        text: `Join my match on TCG Dexter with code ${match.code}`,
        url: `${window.location.origin}/matches/join`,
      });
    } catch (e) {
      // User cancelled — fall back to copy
      if ((e as { name?: string }).name !== "AbortError") {
        copyCode();
      }
    }
  }

  const showJudgeNote = viewerLost(
    {
      id: match.id,
      creator_user_id: match.creator.id,
      opponent_user_id: match.opponent?.id ?? null,
      creator_decklist_id: match.creator_deck.id,
      opponent_decklist_id: match.opponent_deck?.id ?? null,
      creator_result: match.creator_result,
      opponent_result: match.opponent_result,
      status: match.status,
      final_outcome: match.final_outcome,
      final_winner_user_id: match.final_winner_user_id,
      judge_ruled: match.judge_ruled,
    },
    viewerId
  ) && match.judge_ruled;

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          {match.status === "finalized"
            ? "Match finalized"
            : match.status === "under_review"
            ? "Under judge review"
            : match.status === "conflict"
            ? "Results disagree"
            : match.opponent
            ? "Match in progress"
            : "Waiting for opponent"}
        </h1>
        <StatusPill status={match.status} />
      </div>

      {/* Code share — only when still joinable and viewer is creator */}
      {match.code && isCreator && !match.opponent && (
        <div className="mb-4 rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
            Share this code with your opponent
          </p>
          <p className="text-4xl font-mono font-bold tracking-[0.2em] text-text-primary mb-4">
            {match.code}
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center justify-center rounded-full bg-black border border-transparent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              onClick={shareCode}
              className="inline-flex items-center justify-center rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Share…
            </button>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Code stops working as soon as someone joins.
          </p>
        </div>
      )}

      {/* Both decks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <PlayerCard
          label="You"
          player={me}
          deck={myDeck}
          result={myResult}
          status={match.status}
          isFinalWinner={match.final_winner_user_id === viewerId}
        />
        <PlayerCard
          label="Opponent"
          player={them}
          deck={theirDeck}
          result={theirResult}
          status={match.status}
          isFinalWinner={
            match.final_winner_user_id !== null &&
            match.final_winner_user_id !== viewerId
          }
        />
      </div>

      {/* Action area */}
      {match.opponent && match.status !== "finalized" && match.status !== "under_review" && (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
          <p className="text-sm font-semibold text-text-primary mb-3">
            {myResult
              ? `You submitted: ${labelFor(myResult)}. Change?`
              : "Submit your result"}
          </p>
          <div className="flex gap-2">
            <ResultButton
              label="I won"
              onClick={() => submitResult("win")}
              disabled={busy}
              active={myResult === "win"}
              tone="win"
            />
            <ResultButton
              label="Draw"
              onClick={() => submitResult("draw")}
              disabled={busy}
              active={myResult === "draw"}
              tone="draw"
            />
            <ResultButton
              label="I lost"
              onClick={() => submitResult("loss")}
              disabled={busy}
              active={myResult === "loss"}
              tone="loss"
            />
          </div>
          {match.status === "conflict" && (
            <div className="mt-4 pt-4 border-t border-bg">
              <p className="text-xs text-text-secondary mb-2">
                Your result and your opponent&apos;s don&apos;t match. Either change yours
                above, or escalate to a judge with photo evidence.
              </p>
              <Link
                href={`/matches/${match.id}/dispute`}
                className="inline-flex items-center justify-center rounded-full border border-accent/30 text-accent px-3 py-1.5 text-xs font-semibold hover:bg-accent/5 transition-colors"
              >
                Request judge ruling
              </Link>
            </div>
          )}
          {error && <p className="text-xs text-accent mt-3">{error}</p>}
        </div>
      )}

      {match.status === "under_review" && (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
          <p className="text-sm text-text-secondary">
            A judge is reviewing the evidence. You&apos;ll see the final result here
            once it&apos;s ruled.
          </p>
        </div>
      )}

      {match.status === "finalized" && (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
          <p className="text-base font-semibold text-text-primary mb-1">
            {match.final_outcome === "draw"
              ? "Draw"
              : match.final_winner_user_id === viewerId
              ? "You won"
              : "You lost"}
          </p>
          {match.finalized_at && (
            <p className="text-xs text-text-muted">
              Finalized{" "}
              {new Date(match.finalized_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
          {showJudgeNote && (
            <p className="text-xs text-text-secondary mt-3">
              Result determined by a judge ruling.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: SharedStatus }) {
  const map: Record<SharedStatus, { label: string; cls: string }> = {
    pending: {
      label: "Pending",
      cls: "bg-stone-100 text-stone-700 border-stone-200",
    },
    finalized: {
      label: "Verified",
      cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    conflict: {
      label: "Conflict",
      cls: "bg-rose-100 text-rose-800 border-rose-200",
    },
    under_review: {
      label: "Under review",
      cls: "bg-amber-100 text-amber-800 border-amber-200",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function PlayerCard({
  label,
  player,
  deck,
  result,
  status,
  isFinalWinner,
}: {
  label: string;
  player: PlayerSlim | null;
  deck: DeckSlim | null;
  result: SharedResult | null;
  status: SharedStatus;
  isFinalWinner: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
        {label}
      </p>
      {player ? (
        <p className="text-sm font-semibold text-text-primary truncate">
          {player.display_name}{" "}
          <span className="text-text-muted font-normal">@{player.username}</span>
        </p>
      ) : (
        <p className="text-sm text-text-muted italic">Waiting…</p>
      )}
      {deck && (
        <p className="text-xs text-text-secondary truncate mt-1">
          {deck.name}
          {deck.archetype && (
            <span className="text-text-muted"> · {deck.archetype}</span>
          )}
        </p>
      )}
      <div className="mt-2">
        {status === "finalized" && isFinalWinner && (
          <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
            Winner
          </span>
        )}
        {status !== "finalized" && (
          <span className="inline-flex items-center text-xs text-text-muted">
            {result ? `Submitted: ${labelFor(result)}` : "No result yet"}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultButton({
  label,
  onClick,
  disabled,
  active,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active: boolean;
  tone: "win" | "loss" | "draw";
}) {
  const toneCls = active
    ? tone === "win"
      ? "bg-emerald-600 text-white border-transparent"
      : tone === "loss"
      ? "bg-rose-600 text-white border-transparent"
      : "bg-stone-600 text-white border-transparent"
    : "bg-bg text-text-primary border-black/10";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${toneCls}`}
    >
      {label}
    </button>
  );
}

function labelFor(r: SharedResult) {
  return r === "win" ? "Win" : r === "loss" ? "Loss" : "Draw";
}
