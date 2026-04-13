"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ─── External link arrow icon ───────────────────────────────── */
function ExternalIcon() {
  return (
    <svg
      className="w-3 h-3 text-text-muted flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

/* ─── Internal link chevron ──────────────────────────────────── */
function ChevronRight() {
  return (
    <svg
      className="w-3.5 h-3.5 text-text-muted flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export default function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Check auth state on mount and subscribe to changes */
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user);
      if (user?.email) {
        setDisplayName(user.email.split("@")[0]);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      if (session?.user?.email) {
        setDisplayName(session.user.email.split("@")[0]);
      } else {
        setDisplayName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const close = () => setOpen(false);

  const internalLinks = [
    { label: "Deck Profiler", href: "/" },
    { label: "Meta Decks", href: "/meta-decks" },
    { label: "My Decks", href: "/my-decks" },
  ];

  const externalLinks = [
    { label: "TCG News", href: "https://tcgdexter.beehiiv.com/" },
    { label: "TCG Dexter on TikTok", href: "https://www.tiktok.com/@tcgdexter" },
    { label: "Card Shop", href: "https://www.ebay.com/usr/tcgdexter" },
  ];

  return (
    <div ref={panelRef} className="relative">
      {/* Hamburger button — unchanged */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Navigation menu"
        className="theme-menu-btn flex flex-col justify-center items-center gap-[4px] w-8 h-8 rounded-md transition-colors hover:bg-surface-2"
      >
        <span className="theme-menu-bar block w-5 h-[2px] rounded-full bg-text-secondary" />
        <span className="theme-menu-bar block w-5 h-[2px] rounded-full bg-text-secondary" />
        <span className="theme-menu-bar block w-5 h-[2px] rounded-full bg-text-secondary" />
      </button>

      {/* Navigation drawer */}
      {open && (
        <div
          className="absolute left-0 top-10 z-50 rounded-xl bg-surface shadow-xl"
          style={{ width: "260px" }}
        >
          {/* ── Section 1: Navigation ── */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Navigation
            </p>

            {internalLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="flex items-center justify-between w-full min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
              >
                <span>{label}</span>
                <ChevronRight />
              </Link>
            ))}

            {externalLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex items-center justify-between w-full min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
              >
                <span>{label}</span>
                <ExternalIcon />
              </a>
            ))}
          </div>

          {/* ── Divider ── */}
          <div className="mx-4 my-1 border-t border-border" />

          {/* ── Section 2: Account ── */}
          <div className="px-4 pt-2 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Account
            </p>
            {signedIn === null ? (
              // Placeholder while auth state loads — prevents layout flicker
              <div className="min-h-[44px]" />
            ) : signedIn ? (
              <Link
                href="/account"
                onClick={close}
                className="flex items-center justify-between w-full min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
              >
                <span className="truncate">{displayName ?? "Account"}</span>
                <ChevronRight />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                onClick={close}
                className="flex items-center justify-between w-full min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
              >
                <span>Sign in</span>
                <ChevronRight />
              </Link>
            )}
          </div>

          <div className="pb-2" />
        </div>
      )}
    </div>
  );
}
