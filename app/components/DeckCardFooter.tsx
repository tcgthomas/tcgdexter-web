"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** UUID of the saved_deck row. Undefined for meta-deck cards. */
  deckId?: string;
  initialLikes: number;
  /** Canonical URL for the deck — used by Share (QR) and the meta-deck
   * fallback for Save (which still navigates rather than clones). */
  saveHref: string;
  /** Display name surfaced inside the share modal heading. */
  deckName?: string;
}

type PromptKind = "like" | "save" | null;

export default function DeckCardFooter({
  deckId,
  initialLikes,
  saveHref,
  deckName,
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [saved, setSaved] = useState(false);
  const [savingPending, setSavingPending] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState<PromptKind>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [savedToast, setSavedToast] = useState<"saved" | "removed" | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setSignedIn(!!user);
      if (!user || !deckId) return;

      supabase
        .from("deck_likes")
        .select("id")
        .eq("saved_deck_id", deckId)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setLiked(!!data);
        });

      supabase
        .from("saved_decks")
        .select("id")
        .eq("cloned_from_id", deckId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setSaved(!!data);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Lock body scroll while the share modal is open.
  useEffect(() => {
    if (!shareOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shareOpen]);

  // Auto-dismiss the "Saved/Removed" toast.
  useEffect(() => {
    if (!savedToast) return;
    const t = setTimeout(() => setSavedToast(null), 1800);
    return () => clearTimeout(t);
  }, [savedToast]);

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!deckId) return;
    if (!signedIn) {
      setPrompt("like");
      return;
    }

    const newLiked = !liked;
    setLiked(newLiked);
    setLikes((n) => n + (newLiked ? 1 : -1));

    const res = await fetch(`/api/saved-decks/${deckId}/like`, {
      method: newLiked ? "POST" : "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      setLikes(data.like_count);
    } else {
      setLiked(!newLiked);
      setLikes((n) => n + (newLiked ? -1 : 1));
      if (res.status === 401) setPrompt("like");
    }
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Meta-deck cards (no deckId) fall back to navigating to the archetype
    // page — there's no source saved_deck to clone from.
    if (!deckId) {
      router.push(saveHref);
      return;
    }

    if (!signedIn) {
      setPrompt("save");
      return;
    }
    if (savingPending) return;

    const newSaved = !saved;
    setSaved(newSaved);
    setSavingPending(true);

    const res = await fetch(`/api/saved-decks/${deckId}/clone`, {
      method: newSaved ? "POST" : "DELETE",
    });

    setSavingPending(false);

    if (!res.ok) {
      setSaved(!newSaved);
      if (res.status === 401) setPrompt("save");
      return;
    }

    setSavedToast(newSaved ? "saved" : "removed");
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShareCopied(false);
    setShareOpen(true);
  }

  // Build an absolute URL at click-time so QR scanners can resolve it.
  const absoluteShareUrl =
    typeof window !== "undefined" && shareOpen
      ? new URL(saveHref, window.location.origin).toString()
      : null;

  async function handleCopyShareUrl() {
    if (!absoluteShareUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteShareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* silent — user can long-press the URL */
    }
  }

  const qrSrc = absoluteShareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        absoluteShareUrl,
      )}&color=1a1a1a&bgcolor=ffffff&margin=1`
    : null;

  return (
    <>
      <div className="flex items-center justify-around border-t border-black/5">
        {deckId !== undefined && (
          <button
            onClick={handleLike}
            aria-pressed={liked}
            aria-label={liked ? "Unlike deck" : "Like deck"}
            className={`flex items-center gap-1.5 py-2.5 text-[13px] font-semibold transition-colors ${
              liked
                ? "text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <svg
              className="w-[15px] h-[15px]"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likes > 0 && likes}
          </button>
        )}

        <button
          onClick={handleSave}
          aria-pressed={saved}
          aria-label={saved ? "Remove from your library" : "Save to your library"}
          disabled={savingPending}
          className={`flex items-center gap-1.5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
            saved
              ? "text-accent"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <svg
            className="w-[15px] h-[15px]"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saved ? "Saved" : "Save"}
        </button>

        <button
          onClick={handleShare}
          aria-label="Share deck"
          className="flex items-center gap-1.5 py-2.5 text-[13px] font-semibold text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg
            className="w-[15px] h-[15px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
      </div>

      {/* ── Sign-in prompt ────────────────────────────────────────── */}
      {prompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setPrompt(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {prompt === "like" ? "Sign in to like decks" : "Sign in to save decks"}
              </h2>
              <button
                onClick={() => setPrompt(null)}
                className="text-text-muted hover:text-text-primary -mt-1 -mr-1 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
              {prompt === "like"
                ? "Sign in to like and keep track of your favourite decks."
                : "Sign in to save decks to your collection and start building your library."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() =>
                  router.push(`/sign-in?next=${encodeURIComponent(saveHref)}`)
                }
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-light"
              >
                Sign in
              </button>
              <button
                onClick={() => setPrompt(null)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share modal (QR + copy) ───────────────────────────────── */}
      {mounted && shareOpen && absoluteShareUrl && createPortal(
        <div
          className="fixed z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          style={{
            top: "calc(-1 * env(safe-area-inset-top))",
            right: "calc(-1 * env(safe-area-inset-right))",
            bottom: "calc(-1 * env(safe-area-inset-bottom))",
            left: "calc(-1 * env(safe-area-inset-left))",
          }}
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-xl border border-black/5 p-6 shadow-brand-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-text-primary">
                Share deck
              </h2>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-text-muted hover:text-text-primary hover:bg-black/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {deckName && (
              <p className="text-xs text-text-muted mb-4 truncate">{deckName}</p>
            )}

            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="absolute -inset-px rounded-xl bg-gradient-brand opacity-60 blur-xl pointer-events-none" />
                <div className="relative rounded-xl border border-black/5 bg-white p-3">
                  {qrSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt="QR code for deck"
                      width={180}
                      height={180}
                      className="rounded-md block"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={absoluteShareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 rounded-lg border border-black/5 bg-white px-3 py-2 text-xs text-text-secondary focus:outline-none"
              />
              <button
                onClick={handleCopyShareUrl}
                className="flex-shrink-0 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-light transition-colors"
              >
                {shareCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Save confirmation toast ───────────────────────────────── */}
      {savedToast && mounted && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg animate-fade-toast">
          {savedToast === "saved" ? "Saved to your library" : "Removed from library"}
        </div>,
        document.body,
      )}
    </>
  );
}
