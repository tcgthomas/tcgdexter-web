"use client";

import { useState } from "react";
import Link from "next/link";
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

type ExpandMode = null | "quicklog" | "manage";

/**
 * Single row in the My Decks list.
 *
 * Collapsed: two rows — (1) deck name + W-L record, (2) quick action buttons.
 * Tapping anywhere outside the action buttons toggles the manage panel.
 *
 * Two mutually exclusive expand modes:
 *   - Quick-log (triggered by Log Match button): shows the match form inline.
 *   - Manage (triggered by tapping the row): shows deck list, view profile,
 *     rename, delete.
 */
export default function SavedDeckRow({
  deck,
  isLast,
  matchStats,
}: Props) {
  const router = useRouter();
  const [expandMode, setExpandMode] = useState<ExpandMode>(null);

  const [name, setName] = useState(deck.name);
  const [editingName, setEditingName] = useState(false);
  const [renameInput, setRenameInput] = useState(deck.name);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const wins = matchStats?.wins ?? 0;
  const losses = matchStats?.losses ?? 0;
  const draws = matchStats?.draws ?? 0;
  const totalMatches = wins + losses + draws;

  const wlRecord =
    totalMatches === 0
      ? "No matches"
      : draws > 0
        ? `${wins}W - ${losses}L - ${draws}D`
        : `${wins}W - ${losses}L`;

  // ── Handlers ────────────────────────────────────────────────

  function toggleExpand(mode: ExpandMode) {
    setExpandMode((current) => (current === mode ? null : mode));
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
    setExpandMode(null);
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

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/saved-decks/${deck.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleted(true);
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "Failed to delete.");
        setBusy(false);
      }
    } catch {
      setErrorMsg("Network error.");
      setBusy(false);
    }
  }

  if (deleted) return null;

  return (
    <div className={`bg-white${isLast ? "" : " border-b border-bg"}`}>
      {/* ── Collapsed row ──────────────────────────────────── */}
      {/* Clicking the outer container toggles manage; action buttons stop propagation */}
      <div
        className="px-5 py-3.5 cursor-pointer"
        onClick={() => toggleExpand("manage")}
      >
        {/* Row 1: deck name + W-L record */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-text-primary text-base truncate min-w-0 mr-2">
            {name}
          </span>
          <span className="flex-shrink-0 text-xs font-semibold text-text-muted tabular-nums">
            {wlRecord}
          </span>
        </div>

        {/* Win rate */}
        <span className="flex-shrink-0 text-xs font-semibold text-text-muted tabular-nums">
          {winRate !== null ? `${winRate}%` : "—"}
        </span>

        {/* Log Match button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand("quicklog");
          }}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
            expandMode === "quicklog"
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

        {/* QR share button */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <QRCodeButton
            deckList={deck.deck_list}
            analysis={deck.analysis as unknown}
          />
        </div>
      </div>

      {/* ── Quick-log expand ────────────────────────────────── */}
      {expandMode === "quicklog" && (
        <div className="px-5 pb-4">
          <MatchForm
            onSubmit={handleQuickLog}
            onCancel={() => setExpandMode(null)}
          />
        </div>
      )}

      {/* ── Manage expand ──────────────────────────────────── */}
      {expandMode === "manage" && (
        <div className="px-5 pb-4 border-t border-border/50">
          {/* View Deck Profile */}
          <Link
            href={`/my-decks/${deck.id}`}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-text-primary px-4 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-90"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            View Deck Profile
          </Link>

          {/* Deck list (read-only) */}
          <div className="mt-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Deck List
            </span>
            <pre className="mt-2 text-xs font-mono text-text-secondary whitespace-pre-wrap bg-bg rounded-lg border border-border p-3 max-h-80 overflow-auto">
              {deck.deck_list}
            </pre>
          </div>

          {/* Rename + Delete */}
          {editingName ? (
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Deck name"
                disabled={busy}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
              />
              <button
                onClick={handleRename}
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setRenameInput(name);
                  setErrorMsg(null);
                }}
                disabled={busy}
                className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setEditingName(true)}
                disabled={busy}
                className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-2 disabled:opacity-50"
              >
                Rename
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="rounded-lg border border-red-200 bg-bg px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
          {errorMsg && (
            <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
