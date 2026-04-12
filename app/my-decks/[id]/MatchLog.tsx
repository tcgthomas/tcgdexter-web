"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ─── Meta archetype names for autocomplete ─────────────────── */
// Inlined from meta-archetypes.json top 30. Updated when the data refreshes.
const META_ARCHETYPES = [
  "Alakazam Dudunsparce", "Ceruledge", "Clefairy Ogerpon", "Crustle",
  "Cynthia's Garchomp", "Dragapult", "Dragapult Blaziken", "Dragapult Dusknoir",
  "Festival Lead", "Flareon Noctowl", "Froslass Munkidori", "Greninja",
  "Grimmsnarl Froslass", "Hop's Trevenant", "Lucario Hariyama", "Mega Absol Box",
  "Mega Kangaskhan", "Mega Lucario", "Mega Starmie", "Mega Venusaur",
  "N's Zoroark", "Ogerpon Meganium", "Okidogi", "Raging Bolt Ogerpon",
  "Rocket's Honchkrow", "Rocket's Mewtwo", "Slowking", "Starmie Froslass",
  "Steven's Metagross", "Tera Box",
];

/* ─── Types ──────────────────────────────────────────────────── */

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
  initialMatches: Match[];
}

/* ─── Result styling ─────────────────────────────────────────── */

const RESULT_STYLE = {
  win:  { label: "W", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  loss: { label: "L", bg: "bg-red-100",   text: "text-red-800",   border: "border-red-200" },
  draw: { label: "D", bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-200" },
};

/* ─── Component ──────────────────────────────────────────────── */

export default function MatchLog({ savedDeckId, initialMatches }: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  // ── Log form state ──────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [result, setResult] = useState<"win" | "loss" | "draw" | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const [opponentArchetype, setOpponentArchetype] = useState("");
  const [opponentDeckList, setOpponentDeckList] = useState("");
  const [showDeckListField, setShowDeckListField] = useState(false);
  const [matchNotes, setMatchNotes] = useState("");
  const [showDateField, setShowDateField] = useState(false);
  const [matchDate, setMatchDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD for date input default
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Archetype autocomplete ──────────────────────────────────
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleArchetypeChange(val: string) {
    setOpponentArchetype(val);
    if (val.trim().length > 0) {
      const lower = val.toLowerCase();
      setSuggestions(
        META_ARCHETYPES.filter((a) => a.toLowerCase().includes(lower)).slice(0, 6)
      );
      setShowSuggestions(true);
    } else {
      setSuggestions(META_ARCHETYPES.slice(0, 8));
      setShowSuggestions(false);
    }
  }

  // ── Stats ───────────────────────────────────────────────────
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const draws = matches.filter((m) => m.result === "draw").length;
  const total = wins + losses + draws;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

  // ── Streak ──────────────────────────────────────────────────
  let streak = 0;
  let streakType: "win" | "loss" | null = null;
  for (const m of matches) {
    if (streakType === null) {
      streakType = m.result === "win" ? "win" : m.result === "loss" ? "loss" : null;
      if (streakType) streak = 1;
    } else if (m.result === streakType) {
      streak++;
    } else {
      break;
    }
  }

  async function handleSubmit() {
    if (!result) {
      setError("Select a result.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_deck_id: savedDeckId,
          result,
          opponent_name: opponentName.trim() || null,
          opponent_archetype: opponentArchetype.trim() || null,
          opponent_deck_list: showDeckListField ? opponentDeckList.trim() || null : null,
          notes: matchNotes.trim() || null,
          played_at: showDateField ? new Date(matchDate + "T12:00:00").toISOString() : null,
        }),
      });
      if (res.ok) {
        // Reset form
        setResult(null);
        setOpponentName("");
        setOpponentArchetype("");
        setOpponentDeckList("");
        setShowDeckListField(false);
        setMatchNotes("");
        setShowDateField(false);
        setFormOpen(false);
        // Refresh server component to get updated match list
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to log match.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(matchId: string) {
    if (!confirm("Delete this match?")) return;
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* ── Header + Stats ────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Match Log</h2>
        {total > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-green-700">{wins}W</span>
            <span className="text-text-muted">-</span>
            <span className="font-semibold text-red-700">{losses}L</span>
            {draws > 0 && (
              <>
                <span className="text-text-muted">-</span>
                <span className="font-semibold text-stone-600">{draws}D</span>
              </>
            )}
            <span className="text-xs text-text-muted ml-1">({winRate}%)</span>
            {streak >= 3 && streakType === "win" && (
              <span className="text-xs font-bold text-green-600 ml-1">
                {streak}W streak
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Log Match Button / Form ───────────────────────── */}
      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-text-primary px-4 py-2.5 text-sm font-semibold text-bg transition-all hover:opacity-90"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log Match
        </button>
      ) : (
        <div className="border border-border rounded-lg p-4 mb-4">
          {/* Result buttons */}
          <div className="flex gap-2 mb-3">
            {(["win", "loss", "draw"] as const).map((r) => {
              const s = RESULT_STYLE[r];
              const selected = result === r;
              return (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-bold transition-all ${
                    selected
                      ? `${s.bg} ${s.text} ${s.border} ring-2 ring-offset-1 ring-current`
                      : "border-border bg-bg text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  {r === "win" ? "Win" : r === "loss" ? "Loss" : "Draw"}
                </button>
              );
            })}
          </div>

          {/* Opponent name */}
          <input
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="Opponent name (optional)"
            className="w-full mb-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
          />

          {/* Opponent archetype with autocomplete */}
          <div className="relative mb-2" ref={suggestionsRef}>
            <input
              type="text"
              value={opponentArchetype}
              onChange={(e) => handleArchetypeChange(e.target.value)}
              onFocus={() => {
                if (opponentArchetype.trim() === "") {
                  setSuggestions(META_ARCHETYPES.slice(0, 8));
                }
                setShowSuggestions(true);
              }}
              placeholder="Opponent deck / archetype (optional)"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-border bg-surface shadow-lg max-h-48 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setOpponentArchetype(s);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Match notes */}
          <input
            type="text"
            value={matchNotes}
            onChange={(e) => setMatchNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full mb-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
          />

          {/* Optional toggles — left-aligned */}
          <div className="flex flex-col items-start gap-1 mb-3">
            {/* Optional opponent deck list */}
            {!showDeckListField ? (
              <button
                type="button"
                onClick={() => setShowDeckListField(true)}
                className="text-xs text-accent hover:text-accent-light transition-colors"
              >
                + Add opponent deck list
              </button>
            ) : (
              <div className="w-full">
                <textarea
                  value={opponentDeckList}
                  onChange={(e) => setOpponentDeckList(e.target.value)}
                  placeholder="Paste opponent's deck list (optional)"
                  rows={4}
                  className="w-full mb-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 resize-y [font-size:16px] sm:text-xs"
                />
                <button
                  type="button"
                  onClick={() => { setShowDeckListField(false); setOpponentDeckList(""); }}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Remove deck list
                </button>
              </div>
            )}

            {/* Optional date */}
            {!showDateField ? (
              <button
                type="button"
                onClick={() => setShowDateField(true)}
                className="text-xs text-accent hover:text-accent-light transition-colors"
              >
                + Add match date
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowDateField(false)}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !result}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Saving..." : "Save Match"}
            </button>
            <button
              onClick={() => {
                setFormOpen(false);
                setResult(null);
                setError(null);
              }}
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-2 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Match List ────────────────────────────────────── */}
      {matches.length === 0 && !formOpen && (
        <p className="text-sm text-text-muted mt-3 text-center">
          No matches logged yet. Tap Log Match after your next game.
        </p>
      )}

      {matches.length > 0 && (
        <div className="mt-4 flex flex-col">
          {matches.map((match, i) => {
            const s = RESULT_STYLE[match.result];
            const dateStr = match.played_at
              ? new Date(match.played_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : null;
            return (
              <div
                key={match.id}
                className={`flex items-start gap-3 px-1 py-3 ${
                  i < matches.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${s.bg} ${s.text} ${s.border} border`}
                >
                  {s.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {match.opponent_archetype && (
                      <span className="font-semibold text-text-primary truncate">
                        vs {match.opponent_archetype}
                      </span>
                    )}
                    {match.opponent_name && !match.opponent_archetype && (
                      <span className="font-semibold text-text-primary truncate">
                        vs {match.opponent_name}
                      </span>
                    )}
                    {match.opponent_name && match.opponent_archetype && (
                      <span className="text-xs text-text-muted truncate">
                        ({match.opponent_name})
                      </span>
                    )}
                    {!match.opponent_archetype && !match.opponent_name && (
                      <span className="text-text-muted text-sm">Match logged</span>
                    )}
                  </div>
                  {match.notes && (
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                      {match.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {dateStr && <span className="text-xs text-text-muted">{dateStr}</span>}
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="text-text-muted/50 hover:text-red-600 transition-colors"
                    title="Delete match"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
