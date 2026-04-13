"use client";

import { useState } from "react";

interface Props {
  deckList: string;
  analysis: unknown;
  className?: string;
}

export default function ShareButton({ deckList, analysis, className }: Props) {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setShareError(null);
    setShareUrl(null);
    try {
      const res = await fetch("/api/deck-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckList, analysis }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setShareUrl(data.url);
      } else {
        setShareError(data.error ?? "Failed to create share link.");
      }
    } catch {
      setShareError("Network error — please try again.");
    } finally {
      setSharing(false);
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) return;
    if (typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "TCG Dexter — Deck Profile",
        text: "Check out this Pokémon TCG deck profile:",
        url: shareUrl,
      });
    } catch {
      // User cancelled or share failed — no-op, modal stays open.
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      setShareError("Couldn't copy automatically — select the URL above and copy manually.");
    }
  }

  function closeShareModal() {
    setShareUrl(null);
    setShareError(null);
  }

  const baseClasses =
    className ??
    "flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <button onClick={handleShare} disabled={sharing} className={baseClasses}>
        {sharing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sharing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
            Share
          </>
        )}
      </button>

      {/* ── Share Modal ─────────────────────────────────────── */}
      {shareUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeShareModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Share this deck</h2>
              <button
                onClick={closeShareModal}
                aria-label="Close"
                className="text-text-muted hover:text-text-primary transition-colors -mt-1 -mr-1 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              Anyone with this link can view your deck profile.
            </p>

            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 [font-size:16px] sm:text-xs"
            />

            {shareError && (
              <p className="mt-2 text-xs text-red-600">{shareError}</p>
            )}

            <div className="mt-4 flex gap-2">
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  onClick={handleNativeShare}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                  Share…
                </button>
              )}
              <button
                onClick={handleCopyShareUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-surface-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Copy-confirmation toast ─────────────────────────── */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg animate-fade-toast">
          Link copied!
        </div>
      )}
    </>
  );
}
