"use client";

import { useState } from "react";
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
 * Manages the shared logOpen state so the subtitle "Log Match" button
 * can control the MatchLog form that lives in topSlot.
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
  const [logOpen, setLogOpen] = useState(false);

  return (
    <DeckProfileView
      deckList={deckList}
      analysis={analysis}
      profiledAt={profiledAt}
      pageTitle={pageTitle}
      subtitle={
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
        </div>
      }
      hideSave
      topSlot={
        <>
          <MatchLog
            savedDeckId={savedDeckId}
            initialMatches={initialMatches}
            open={logOpen}
            onOpenChange={setLogOpen}
          />
          <DeckNotes savedDeckId={savedDeckId} initialNotes={initialNotes} />
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
