"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** UUID of the saved_deck row. Undefined for meta-deck cards (no like API). */
  deckId?: string;
  initialLikes: number;
  saveHref: string;
}

export default function DeckCardFooter({ deckId, initialLikes, saveHref }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState<"like" | "save" | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setSignedIn(!!user);
      if (user && deckId) {
        supabase
          .from("deck_likes")
          .select("id")
          .eq("saved_deck_id", deckId)
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (!cancelled) setLiked(!!data);
          });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deckId]);

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

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      setPrompt("save");
      return;
    }
    router.push(saveHref);
  }

  return (
    <>
      <div className="flex items-center border-t border-black/5 px-3.5">
        {deckId !== undefined && (
          <>
            <button
              onClick={handleLike}
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
            <div className="w-px bg-black/5 mx-3 h-8" />
          </>
        )}

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-text-muted hover:text-text-secondary transition-colors py-2.5"
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
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Save
        </button>

        <div className="w-px bg-black/5 mx-3 h-8" />

        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-text-muted py-2.5">
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
        </div>
      </div>

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
    </>
  );
}
