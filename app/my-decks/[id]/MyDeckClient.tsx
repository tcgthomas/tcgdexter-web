"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DeckProfileView, {
  type AnalysisResult,
} from "@/app/components/DeckProfileView";
import QRCodeButton from "@/app/components/QRCodeButton";
import CopyDeckListButton from "@/app/components/CopyDeckListButton";
import MatchLog from "./MatchLog";
import DeckNotes from "./DeckNotes";

interface Match {
  id: string;
  result: "win" | "loss" | "draw";
  opponent_name: string | null;
  opponent_archetype: string | null;
  opponent_deck_list: string | null;
  notes: string | null;
  played_at: string;
}

interface Props {
  savedDeckId: string;
  deckList: string;
  analysis: AnalysisResult;
  initialMatches: Match[];
  initialNotes: string;
  pageTitle: string;
  profiledAt: string;
}

/**
 * Client wrapper for the saved deck detail page.
 * Action buttons, match log, notes, and deck list all live in topSlot
 * so their spacing is controlled by the flex gap rather than the header padding.
 */
export default function MyDeckClient({
  savedDeckId,
  deckList,
  analysis,
  initialMatches,
  initialNotes,
  pageTitle,
  profiledAt,
}: Props) {
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/saved-decks/${savedDeckId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/my-decks");
      }
    } catch {
      // silent — user can retry
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DeckProfileView
      deckList={deckList}
      analysis={analysis}
      profiledAt={profiledAt}
      pageTitle={pageTitle}
      hideSave
      topSlot={
        <>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                logOpen
                  ? "bg-accent border-accent text-white"
                  : "border-border bg-bg text-text-secondary hover:bg-surface-2"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Log Match
            </button>
            <CopyDeckListButton deckList={deckList} />
            <QRCodeButton deckList={deckList} analysis={analysis} />
            {/* Delete — icon-only, same size as QR button */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete deck"
              className="inline-flex items-center justify-center rounded-md bg-black border border-transparent px-3 py-1.5 text-white disabled:opacity-50 transition-opacity hover:opacity-80"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>

          <MatchLog
            savedDeckId={savedDeckId}
            initialMatches={initialMatches}
            open={logOpen}
            onOpenChange={setLogOpen}
          />
          <DeckNotes savedDeckId={savedDeckId} initialNotes={initialNotes} />

          {/* Deck list */}
          <div className="rounded-xl bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">
              Deck List
            </h2>
            <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap leading-relaxed">
              {deckList}
            </pre>
          </div>
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
