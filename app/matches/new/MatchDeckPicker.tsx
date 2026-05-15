"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PickerDeck {
  id: string;
  name: string;
  archetype: string | null;
}

interface Props {
  decks: PickerDeck[];
}

export default function MatchDeckPicker({ decks }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/matches/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_deck_id: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create match.");
      router.push(`/matches/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create match.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
        {decks.map((deck, i) => {
          const selected = deck.id === selectedId;
          return (
            <button
              key={deck.id}
              type="button"
              onClick={() => setSelectedId(deck.id)}
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedId || submitting}
          className="inline-flex items-center justify-center rounded-full bg-black border border-transparent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
        >
          {submitting ? "Creating…" : "Generate code"}
        </button>
      </div>
    </div>
  );
}
