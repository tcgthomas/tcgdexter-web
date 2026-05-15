"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface JoinDeck {
  id: string;
  name: string;
  archetype: string | null;
}

interface MatchPreview {
  id: string;
  creator: { display_name: string; username: string };
  creator_deck: { id: string; name: string; archetype: string | null };
  expires_at: string;
}

interface Props {
  decks: JoinDeck[];
}

export default function JoinCodeForm({ decks }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/matches/shared/by-code?code=${encodeURIComponent(code.trim().toUpperCase())}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Lookup failed.");
      setPreview(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmJoin() {
    if (!preview || !selectedDeckId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/matches/shared/${preview.id}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            saved_deck_id: selectedDeckId,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to join.");
      router.push(`/matches/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join.");
      setBusy(false);
    }
  }

  if (!preview) {
    return (
      <form onSubmit={lookup} className="flex flex-col gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MATCH CODE"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg bg-bg px-4 py-3 text-center text-2xl font-mono font-semibold tracking-widest text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:24px]"
        />
        {error && <p className="text-xs text-accent">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!code.trim() || busy}
            className="inline-flex items-center justify-center rounded-full bg-black border border-transparent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
          >
            {busy ? "Looking up…" : "Look up code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
          Match by
        </p>
        <p className="text-base font-semibold text-text-primary">
          {preview.creator.display_name}{" "}
          <span className="text-text-muted font-normal">
            @{preview.creator.username}
          </span>
        </p>
        <p className="text-sm text-text-secondary mt-2">
          Playing <span className="font-semibold">{preview.creator_deck.name}</span>
          {preview.creator_deck.archetype && (
            <span className="text-text-muted"> · {preview.creator_deck.archetype}</span>
          )}
        </p>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-8 text-center">
          <p className="text-sm text-text-secondary">
            You need a saved deck to join.{" "}
            <Link href="/" className="text-accent hover:underline">
              Profile a deck →
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
            {decks.map((deck, i) => {
              const selected = deck.id === selectedDeckId;
              return (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => setSelectedDeckId(deck.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                    i === decks.length - 1 ? "" : "border-b border-bg"
                  } ${selected ? "bg-accent/10" : "hover:bg-black/[0.02]"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-base truncate">
                      {deck.name}
                    </p>
                    {deck.archetype && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {deck.archetype}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 ${
                      selected
                        ? "border-accent bg-accent"
                        : "border-black/15 bg-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    {selected && (
                      <svg viewBox="0 0 20 20" fill="white" className="w-full h-full">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p className="text-xs text-accent">{error}</p>}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setSelectedDeckId(null);
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={confirmJoin}
              disabled={!selectedDeckId || busy}
              className="inline-flex items-center justify-center rounded-full bg-black border border-transparent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
            >
              {busy ? "Joining…" : "Confirm join"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
