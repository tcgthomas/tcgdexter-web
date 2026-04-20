"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Sheet overlay that presents an intercepted deck detail on top of
 * /my-decks. Slides up on mount, slides down on close. Dismisses via
 * close button, backdrop click, or ESC — all route to `router.back()`
 * so the URL returns to /my-decks and the list re-appears.
 */
export default function DeckSheet({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Drive the enter animation on mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock body scroll while the sheet is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function close() {
    // Play the exit animation, then actually pop the route.
    setOpen(false);
    setTimeout(() => router.back(), 220);
  }

  // ESC to dismiss.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close deck"
        onClick={close}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet surface. On mobile this covers the screen; on larger
          viewports it caps at max-w and rounds its top corners. */}
      <div
        className={`absolute inset-x-0 bottom-0 top-0 sm:top-8 mx-auto sm:max-w-3xl overflow-y-auto bg-bg sm:rounded-t-3xl shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.25)] transition-transform duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Close affordance — pinned top-right, safe-area aware */}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="sticky top-0 float-right z-10 m-3 inline-flex items-center justify-center rounded-full bg-black/75 backdrop-blur w-9 h-9 text-white shadow-md hover:bg-black transition-colors"
          style={{ marginTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
