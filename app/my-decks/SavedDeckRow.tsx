"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MatchForm, { type MatchFormData } from "@/app/components/MatchForm";
import QRCodeButton from "@/app/components/QRCodeButton";
import CopyDeckListButton from "@/app/components/CopyDeckListButton";

interface SavedDeck {
  id: string;
  name: string;
  deck_list: string;
  analysis: {
    deckPrice?: number;
    metaMatch?: { archetypeName?: string | null };
    rotation?: { ready?: boolean };
  } | null;
  created_at: string;
  updated_at: string;
}

interface MatchStats {
  wins: number;
  losses: number;
  draws: number;
  lastPlayed: string | null;
}

interface Props {
  deck: SavedDeck;
  isLast: boolean;
  matchStats: MatchStats | null;
}

/**
 * Single row in the My Decks list.
 *
 * Collapsed: two rows — (1) deck name + pencil icon + W-L below, (2) quick action buttons.
 * Tapping the row navigates to the deck profile.
 * Log Match button expands an inline match form.
 * Pencil icon triggers inline rename.
 */
export default function SavedDeckRow({
  deck,
  isLast,
  matchStats,
}: Props) {
  const router = useRouter();
  const [quicklogOpen, setQuicklogOpen] = useState(false);

  const [name, setName] = useState(deck.name);
  const [editingName, setEditingName] = useState(false);
  const [renameInput, setRenameInput] = useState(deck.name);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wins = matchStats?.wins ?? 0;
  const losses = matchStats?.losses ?? 0;
  const draws = matchStats?.draws ?? 0;
  const totalMatches = wins + losses + draws;

  const wlRecord = draws > 0
    ? `${wins}W - ${losses}L - ${draws}D`
    : `${wins}W - ${losses}L`;

  // ── Handlers ────────────────────────────────────────────────

  function handleRowClick() {
    if (editingName) return;
    router.push(`/my-decks/${deck.id}`);
  }

  async function handleQuickLog(data: MatchFormData) {
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved_deck_id: deck.id, ...data }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to log match.");
    }
    setQuicklogOpen(false);
    router.refresh();
  }

  async function handleRename() {
    const trimmed = renameInput.trim();
    if (!trimmed || trimmed === name) {
      setEditingName(false);
      setRenameInput(name);
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/saved-decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setName(trimmed);
        setEditingName(false);
      } else {
        setErrorMsg(data.error ?? "Failed to rename.");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`bg-white${isLast ? "" : " border-b border-bg"}`}>
      {/* ── Collapsed row ──────────────────────────────────── */}
      <div
        className="px-5 py-3.5 cursor-pointer flex items-center gap-3"
        onClick={handleRowClick}
      >
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: deck name + pencil (or inline rename form) */}
          <div className="mb-2">
            {editingName ? (
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  placeholder="Deck name"
                  autoFocus
                  disabled={busy}
                  className="flex-1 min-w-0 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
                />
                <button
                  onClick={handleRename}
                  disabled={busy}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-light disabled:opacity-50"
                >
                  {busy ? "…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setRenameInput(name);
                    setErrorMsg(null);
                  }}
                  disabled={busy}
                  className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-primary text-lg truncate min-w-0">
                  {name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingName(true);
                    setRenameInput(name);
                  }}
                  aria-label="Rename deck"
                  className="flex-shrink-0 text-text-muted hover:text-text-secondary"
                >
                  {/* Pencil icon */}
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
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                    />
                  </svg>
                </button>
              </div>
            )}
            {totalMatches > 0 && !editingName && (
              <span className="text-xs font-semibold text-text-muted tabular-nums">
                {wlRecord}
              </span>
            )}
            {errorMsg && (
              <p className="mt-1 text-xs text-red-600">{errorMsg}</p>
            )}
          </div>

          {/* Row 2: action buttons */}
          {!editingName && (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQuicklogOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  quicklogOpen
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
              <CopyDeckListButton deckList={deck.deck_list} />
              <QRCodeButton
                deckList={deck.deck_list}
                analysis={deck.analysis as unknown}
              />
            </div>
          )}
        </div>

        {/* Right chevron */}
        {!editingName && (
          <svg
            className="flex-shrink-0 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        )}
      </div>

      {/* ── Quick-log expand ────────────────────────────────── */}
      {quicklogOpen && (
        <div className="px-5 pb-4">
          <MatchForm
            onSubmit={handleQuickLog}
            onCancel={() => setQuicklogOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
