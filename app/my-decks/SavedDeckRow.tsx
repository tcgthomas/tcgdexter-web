"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MatchForm, { type MatchFormData } from "@/app/components/MatchForm";
import QRCodeButton from "@/app/components/QRCodeButton";

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
 * Collapsed: two rows — (1) deck name + W-L below, (2) quick action buttons.
 * An absolute-positioned `<Link prefetch>` covers the row so Next.js warms
 * the detail route on hover/viewport; the buttons sit above it via
 * `pointer-events-auto`. The deck title carries `view-transition-name` that
 * matches the detail page's `<h1>`, so the browser morphs between them.
 * Log Match button expands an inline match form.
 */
export default function SavedDeckRow({
  deck,
  isLast,
  matchStats,
}: Props) {
  const router = useRouter();
  const [quicklogOpen, setQuicklogOpen] = useState(false);

  const name = deck.name;

  const wins = matchStats?.wins ?? 0;
  const losses = matchStats?.losses ?? 0;
  const draws = matchStats?.draws ?? 0;
  const totalMatches = wins + losses + draws;

  const wlRecord = draws > 0
    ? `${wins}W - ${losses}L - ${draws}D`
    : `${wins}W - ${losses}L`;

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

  return (
    <div className={`relative bg-white${isLast ? "" : " border-b border-bg"}`}>
      {/* Row-wide link overlay. Prefetches the detail route on hover/viewport.
          Buttons below opt back into pointer events. */}
      <Link
        href={`/my-decks/${deck.id}`}
        prefetch
        aria-label={`Open ${name}`}
        className="absolute inset-0 z-0"
      />

      {/* ── Collapsed row ──────────────────────────────────── */}
      <div className="relative z-10 px-5 py-3.5 flex items-center gap-3 pointer-events-none">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: deck name + W-L */}
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="font-semibold text-text-primary text-lg truncate min-w-0"
              style={{ viewTransitionName: `deck-title-${deck.id}` }}
            >
              {name}
            </span>
            {totalMatches > 0 && (
              <span className="flex-shrink-0 text-xs font-semibold text-text-muted tabular-nums">
                {wlRecord}
              </span>
            )}
          </div>

          {/* Row 2: action buttons — opt back into pointer events */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setQuicklogOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold transition-all ${
                quicklogOpen ? "text-white" : "text-text-secondary"
              }`}
              style={{
                backgroundImage: quicklogOpen
                  ? "linear-gradient(var(--accent), var(--accent)), linear-gradient(90deg, #F2A20C, #D91E0D, #A60D0D)"
                  : "linear-gradient(var(--bg), var(--bg)), linear-gradient(90deg, #F2A20C, #D91E0D, #A60D0D)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
              }}
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
            <QRCodeButton
              deckList={deck.deck_list}
              analysis={deck.analysis as unknown}
            />
          </div>
        </div>

        {/* Right chevron */}
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
      </div>

      {/* ── Quick-log expand ────────────────────────────────── */}
      {quicklogOpen && (
        <div className="relative z-10 px-5 pb-4 pointer-events-auto">
          <MatchForm
            onSubmit={handleQuickLog}
            onCancel={() => setQuicklogOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
