"use client";

import React, { useMemo, useState } from "react";
import { cardImageUrlFor } from "@/lib/primaryCardImage";

interface DeckCard {
  qty: number;
  name: string;
  number: string;
  setCode: string;
  section: "pokemon" | "trainer" | "energy";
}

interface PickableCard {
  key: string;
  name: string;
  number: string;
  setCode: string;
  section: "pokemon" | "trainer" | "energy";
  imageUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cards: DeckCard[];
  /** Currently-selected override URL (null = auto-pick). */
  currentUrl: string | null;
  /** Resolved auto-pick URL, shown as the "Use default" preview. */
  defaultUrl: string | null;
  /** Persist the selection. `null` clears the override. */
  onSelect: (url: string | null) => Promise<void>;
}

const SECTION_LABEL: Record<DeckCard["section"], string> = {
  pokemon: "Pokémon",
  trainer: "Trainer",
  energy: "Energy",
};
const SECTION_ORDER: DeckCard["section"][] = ["pokemon", "trainer", "energy"];

export default function CoverCardPicker({
  open,
  onClose,
  cards,
  currentUrl,
  defaultUrl,
  onSelect,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deduplicate by (name, setCode, number); skip cards we can't resolve to
  // an image URL.
  const grouped = useMemo(() => {
    const seen = new Map<string, PickableCard>();
    for (const card of cards) {
      const key = `${card.name}|${card.setCode}|${card.number}`;
      if (seen.has(key)) continue;
      const imageUrl = cardImageUrlFor(card);
      if (!imageUrl) continue;
      seen.set(key, {
        key,
        name: card.name,
        number: card.number,
        setCode: card.setCode,
        section: card.section,
        imageUrl,
      });
    }
    const out: Record<DeckCard["section"], PickableCard[]> = {
      pokemon: [],
      trainer: [],
      energy: [],
    };
    seen.forEach((c) => {
      out[c.section].push(c);
    });
    return out;
  }, [cards]);

  if (!open) return null;

  async function commit(url: string | null) {
    setBusy(true);
    setError(null);
    try {
      await onSelect(url);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update cover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white/95 backdrop-blur-xl border border-black/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-black/5">
          <div>
            <h2
              id="cover-picker-title"
              className="text-base font-semibold text-text-primary"
            >
              Choose cover card
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Pick any card from your deck list to represent it on previews.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-full p-1.5 text-text-muted hover:bg-black/5 hover:text-text-primary transition disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Default-pick row */}
        <div className="px-5 py-3 border-b border-black/5">
          <button
            type="button"
            onClick={() => commit(null)}
            disabled={busy}
            aria-pressed={currentUrl === null}
            className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition disabled:opacity-50 ${
              currentUrl === null
                ? "border-accent bg-accent/5"
                : "border-black/10 bg-white hover:bg-black/[0.02]"
            }`}
          >
            <div
              className="shrink-0 rounded-md overflow-hidden border border-black/[0.07] bg-[var(--surface)] flex items-center justify-center"
              style={{ width: 44, height: 60 }}
            >
              {defaultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={defaultUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] text-text-muted leading-tight px-1 text-center">
                  Auto
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Auto-pick (default)
              </p>
              <p className="text-xs text-text-secondary">
                Highest-stage Pokémon, most copies.
              </p>
            </div>
            {currentUrl === null && (
              <span className="text-xs font-semibold text-accent">Selected</span>
            )}
          </button>
        </div>

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {SECTION_ORDER.every((s) => grouped[s].length === 0) ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No matchable cards in this deck list.
            </p>
          ) : (
            SECTION_ORDER.filter((s) => grouped[s].length > 0).map((section) => (
              <div key={section} className="mb-5 last:mb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  {SECTION_LABEL[section]}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {grouped[section].map((card) => {
                    const selected = currentUrl === card.imageUrl;
                    return (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => commit(card.imageUrl)}
                        disabled={busy}
                        aria-pressed={selected}
                        className={`group relative rounded-lg overflow-hidden border-2 transition disabled:opacity-50 ${
                          selected
                            ? "border-accent shadow-md"
                            : "border-transparent hover:border-black/20"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          loading="lazy"
                          className="w-full aspect-[5/7] object-cover bg-[var(--surface)]"
                        />
                        <div className="px-1.5 py-1 bg-white">
                          <p className="text-[11px] font-medium text-text-primary truncate">
                            {card.name}
                          </p>
                          <p className="text-[10px] text-text-muted truncate">
                            {card.setCode} {card.number}
                          </p>
                        </div>
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white shadow">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {error && (
          <p className="px-5 pb-3 text-xs text-accent">{error}</p>
        )}
      </div>
    </div>
  );
}
