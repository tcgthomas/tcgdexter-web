"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface Props {
  deck: SavedDeck;
  isLast: boolean;
}

/**
 * Single row in the My Decks list.
 *
 * Shows the deck name, archetype, price, rotation status, and updated date.
 * Expands (via details) to reveal rename + delete actions.
 */
export default function SavedDeckRow({ deck, isLast }: Props) {
  const router = useRouter();

  const [name, setName] = useState(deck.name);
  const [editingName, setEditingName] = useState(false);
  const [renameInput, setRenameInput] = useState(deck.name);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const archetype = deck.analysis?.metaMatch?.archetypeName ?? null;
  const price = deck.analysis?.deckPrice;
  const rotationReady = deck.analysis?.rotation?.ready;
  const updatedStr = new Date(deck.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
        // Refresh the server component to reflect the new list state
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
    <details
      className={`group ${isLast ? "" : "border-b border-border"}`}
    >
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-surface-2 transition-colors">
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-text-primary text-sm truncate">
            {name}
          </span>
          <span className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
            {archetype && <span className="truncate">{archetype}</span>}
            {typeof price === "number" && price > 0 && (
              <span>${price.toFixed(2)}</span>
            )}
            {rotationReady !== undefined && (
              <span
                className={rotationReady ? "text-green-700" : "text-amber-700"}
              >
                {rotationReady ? "Rotation ready" : "Rotation blocked"}
              </span>
            )}
          </span>
        </span>
        <span className="flex-shrink-0 text-xs text-text-muted">
          {updatedStr}
        </span>
        <svg
          className="flex-shrink-0 w-4 h-4 text-text-muted group-open:rotate-180 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>

      <div className="px-5 pb-4 pt-1 border-t border-border/50">
        {editingName ? (
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
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
          <div className="flex flex-wrap gap-2 mt-3">
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

        <details className="mt-3">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
            Show deck list
          </summary>
          <pre className="mt-2 text-xs font-mono text-text-secondary whitespace-pre-wrap bg-bg rounded-lg border border-border p-3 max-h-60 overflow-auto">
            {deck.deck_list}
          </pre>
        </details>
      </div>
    </details>
  );
}
