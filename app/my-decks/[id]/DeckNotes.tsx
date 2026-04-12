"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  savedDeckId: string;
  initialNotes: string;
}

/**
 * Auto-saving notes textarea for a saved deck.
 * Saves on blur and after a 1.5s debounce while typing.
 */
export default function DeckNotes({ savedDeckId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedValue = useRef(initialNotes);

  const save = useCallback(
    async (value: string) => {
      if (value === lastSavedValue.current) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/saved-decks/${savedDeckId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        if (res.ok) {
          lastSavedValue.current = value;
          setLastSaved("Saved");
          setTimeout(() => setLastSaved(null), 2000);
        }
      } catch {
        // Silent — user can retry by editing again
      } finally {
        setSaving(false);
      }
    },
    [savedDeckId],
  );

  function handleChange(value: string) {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(value), 1500);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(notes);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Notes</h2>
        <span className="text-xs text-text-muted">
          {saving ? "Saving..." : lastSaved ?? ""}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Strategy notes, matchup observations, card swap ideas..."
        rows={4}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 resize-y [font-size:16px] sm:text-sm"
      />
    </div>
  );
}
