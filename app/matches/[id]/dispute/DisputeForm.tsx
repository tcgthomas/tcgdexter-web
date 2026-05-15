"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisputeForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please attach an image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      if (note.trim()) form.append("note", note.trim());

      const res = await fetch(`/api/matches/shared/${matchId}/dispute`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit.");
      router.push(`/matches/${matchId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
        <label className="block text-xs uppercase tracking-wide text-text-muted mb-2">
          Evidence
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-primary file:mr-3 file:rounded-full file:border file:border-black/15 file:bg-bg file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text-primary"
        />
        <p className="text-xs text-text-muted mt-2">
          PNG, JPEG, or WebP. Max 5 MB.
        </p>

        <label className="block text-xs uppercase tracking-wide text-text-muted mt-4 mb-2">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the judge should know…"
          rows={3}
          className="w-full rounded-lg bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-sm"
        />
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!file || busy}
          className="inline-flex items-center justify-center rounded-full bg-black border border-transparent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
        >
          {busy ? "Submitting…" : "Submit for ruling"}
        </button>
      </div>
    </form>
  );
}
