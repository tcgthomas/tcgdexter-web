"use client";

import { useState } from "react";
import { validateDisplayName } from "@/lib/display-name-rules";

interface Props {
  initialName: string;
}

/**
 * Inline-editable display name field for the account page.
 *
 * Default state: shows the current name with a small Edit button.
 * Edit state: shows an input + Save/Cancel buttons.
 * Calls PATCH /api/profile on save.
 */
export default function EditDisplayName({ initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = input.trim();
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    // Client-side validation (same rules as server — fast feedback)
    const check = validateDisplayName(trimmed);
    if (!check.valid) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setName(data.display_name);
        setEditing(false);
      } else {
        setError(data.error ?? "Failed to update.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setInput(name);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-bg bg-white">
      <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
        Display name
      </span>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={30}
            disabled={busy}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-36 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text-primary text-right focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
          />
          <button
            onClick={handleSave}
            disabled={busy}
            className="text-xs font-semibold text-accent hover:text-accent-light disabled:opacity-50"
          >
            {busy ? "..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={busy}
            className="text-xs font-semibold text-text-muted hover:text-text-secondary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {name}
          </span>
          <button
            onClick={() => {
              setInput(name);
              setEditing(true);
              setError(null);
            }}
            className="text-xs font-semibold text-accent hover:text-accent-light"
          >
            Edit
          </button>
        </div>
      )}

      {error && (
        <p className="absolute mt-12 text-xs text-accent">{error}</p>
      )}
    </div>
  );
}
