"use client";

import React, { useState } from "react";
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

interface ParsedCard {
  qty: number;
  name: string;
  setCode: string;
  number: string;
}
interface ParsedSection {
  label: string;
  cards: ParsedCard[];
}

const CATEGORY_MAP: Record<string, string> = {
  "pokémon": "Pokémon",
  "pokemon": "Pokémon",
  "trainer": "Trainer",
  "energy": "Energy",
};

function parseDeckList(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const headerMatch = trimmed.match(/^([^:]+):\s*\d+/);
    if (headerMatch) {
      const key = headerMatch[1].toLowerCase();
      if (key in CATEGORY_MAP) {
        current = { label: CATEGORY_MAP[key], cards: [] };
        sections.push(current);
        continue;
      }
    }
    if (current) {
      const tokens = trimmed.split(/\s+/);
      const qty = parseInt(tokens[0]);
      if (!isNaN(qty) && tokens.length >= 4) {
        current.cards.push({
          qty,
          name: tokens.slice(1, tokens.length - 2).join(" "),
          setCode: tokens[tokens.length - 2],
          number: tokens[tokens.length - 1],
        });
      }
    }
  }
  return sections;
}

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

  // Rename state
  const [deckName, setDeckName] = useState(pageTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(pageTitle);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function handleRename() {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === deckName) {
      setEditingTitle(false);
      setTitleInput(deckName);
      return;
    }
    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/saved-decks/${savedDeckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeckName(trimmed);
        setEditingTitle(false);
      } else {
        setRenameError(data.error ?? "Failed to rename.");
      }
    } catch {
      setRenameError("Network error.");
    } finally {
      setRenameBusy(false);
    }
  }

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

  // Pencil button shown inline after the title when not editing
  const titleAction = !editingTitle ? (
    <button
      onClick={() => { setEditingTitle(true); setTitleInput(deckName); }}
      aria-label="Rename deck"
      className="flex-shrink-0 text-on-gradient opacity-50 hover:opacity-100 transition-opacity"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
        />
      </svg>
    </button>
  ) : null;

  // Rename form shown in the subtitle slot when editing.
  // Pass `false` when not editing so DeckProfileView's "Created on" fallback is suppressed.
  const subtitle: React.ReactNode = editingTitle ? (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          autoFocus
          disabled={renameBusy}
          className="flex-1 min-w-0 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
        />
        <button
          onClick={handleRename}
          disabled={renameBusy}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-light disabled:opacity-50"
        >
          {renameBusy ? "…" : "Save"}
        </button>
        <button
          onClick={() => { setEditingTitle(false); setTitleInput(deckName); setRenameError(null); }}
          disabled={renameBusy}
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {renameError && <p className="text-xs text-red-600">{renameError}</p>}
    </div>
  ) : false;

  return (
    <DeckProfileView
      deckList={deckList}
      analysis={analysis}
      profiledAt={profiledAt}
      pageTitle={deckName}
      titleAction={titleAction}
      subtitle={subtitle}
      theme="experiments"
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
            {/* Delete — icon-only, same visual weight as QR button */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete deck"
              className="inline-flex items-center justify-center rounded-md bg-black border border-transparent px-3 py-[7px] text-white disabled:opacity-50 transition-opacity hover:opacity-80"
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
          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">
                Deck List
              </h2>
              <CopyDeckListButton deckList={deckList} iconOnly />
            </div>
            {parseDeckList(deckList).map((section) => (
              <div key={section.label} className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  {section.label} — {section.cards.reduce((s, c) => s + c.qty, 0)}
                </h4>
                <div className="space-y-0.5">
                  {section.cards.map((c, i) => (
                    <div key={i} className="flex items-baseline gap-2 text-sm">
                      <span className="text-text-muted w-5 text-right flex-shrink-0">×{c.qty}</span>
                      <span className="text-text-primary">{c.name}</span>
                      <span className="text-text-muted text-xs">{c.setCode} {c.number}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
