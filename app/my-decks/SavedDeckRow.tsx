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
 * Collapsed: deck name, archetype, price, rotation status, updated date.
 * Expanded: the full deck list (always shown), a Copy button for the list,
 * a View Deck Profile button that loads the deck into the profiler, and
 * Rename / Delete actions.
 */
export default function SavedDeckRow({ deck, isLast }: Props) {
  const router = useRouter();

  const [name, setName] = useState(deck.name);
  const [editingName, setEditingName] = useState(false);
  const [renameInput, setRenameInput] = useState(deck.name);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(deck.deck_list);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg("Couldn't copy — select the text above and copy manually.");
    }
  }

  function handleViewProfile() {
    // Hand off the deck list to the home page via sessionStorage. The home
    // page picks it up on mount, populates the textarea, and triggers
    // analysis automatically so the user lands on a fresh profile view.
    try {
      sessionStorage.setItem(
        "tcgd-load-deck",
        JSON.stringify({ deckList: deck.deck_list, name }),
      );
    } catch {
      // sessionStorage unavailable — the home page will just stay empty
      // and the user can paste manually. No-op here.
    }
    router.push("/");
  }

  if (deleted) return null;

  return (
    <details className={`group ${isLast ? "" : "border-b border-border"}`}>
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
            {rotationReady === false && (
              <span className="text-amber-700">Not Standard legal</span>
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
        {/* ── Primary action: View Deck Profile ───────────── */}
        <button
          onClick={handleViewProfile}
          disabled={busy}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-text-primary px-4 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          View Deck Profile
        </button>

        {/* ── Deck list (always shown) with Copy action ──── */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Deck List
            </span>
            <button
              onClick={handleCopy}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap bg-bg rounded-lg border border-border p-3 max-h-80 overflow-auto">
            {deck.deck_list}
          </pre>
        </div>

        {/* ── Secondary actions: rename + delete ──────────── */}
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
    </details>
  );
}
