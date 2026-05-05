"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SharedOutcome } from "@/lib/shared-matches";

interface Props {
  matchId: string;
  creatorLabel: string;
  opponentLabel: string;
}

export default function JudgeRulingForm({
  matchId,
  creatorLabel,
  opponentLabel,
}: Props) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<SharedOutcome | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) {
      setError("Pick an outcome.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/rule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to rule.");
      router.push("/admin/matches/disputes");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rule.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5 flex flex-col gap-4"
    >
      <h2 className="text-sm font-semibold text-text-primary">Rule</h2>
      <div className="flex flex-col gap-2">
        <OutcomeRadio
          checked={outcome === "creator_win"}
          onChange={() => setOutcome("creator_win")}
          label={`${creatorLabel} won`}
        />
        <OutcomeRadio
          checked={outcome === "opponent_win"}
          onChange={() => setOutcome("opponent_win")}
          label={`${opponentLabel} won`}
        />
        <OutcomeRadio
          checked={outcome === "draw"}
          onChange={() => setOutcome("draw")}
          label="Draw"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-text-muted mb-2">
          Internal note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
        />
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!outcome || busy}
          className="inline-flex items-center justify-center rounded-full bg-black border border-transparent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
        >
          {busy ? "Submitting…" : "Submit ruling"}
        </button>
      </div>
    </form>
  );
}

function OutcomeRadio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
        checked
          ? "border-accent/40 bg-accent/5"
          : "border-black/10 hover:bg-black/[0.02]"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
          checked ? "border-accent bg-accent" : "border-black/15"
        }`}
        aria-hidden="true"
      />
      <span className="text-sm text-text-primary">{label}</span>
    </label>
  );
}
