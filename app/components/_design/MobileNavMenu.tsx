"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  /** Passed from the server component so auth buttons render correctly. */
  isAuthed: boolean;
}

/**
 * Full-screen nav takeover triggered by the TD monogram.
 *
 * When open, covers the entire viewport with solid bg-bg gray — same token
 * as the page background (#f2f2f2), matching the themeColor so iOS chrome
 * blends seamlessly. The panel contains its own header row (identical to the
 * real nav) so there is no visible seam or color break at the top.
 *
 * No full-viewport backdrop hack — the panel itself IS the background.
 * The real nav header sits below the panel (z-30 < z-[110]) and is revealed
 * when the panel fades out on close.
 */
export default function MobileNavMenu({ isAuthed }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape key + Tab focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return;

    const panel = panelRef.current;
    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    // Focus first element (the in-panel close trigger)
    getFocusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusable();
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggle = () => setOpen((o) => !o);

  const INTERNAL_LINKS = [
    { href: "/", label: "Create a Deck Profile" },
    { href: "/meta-decks", label: "Top 30 Meta Decks" },
    { href: "/my-decks", label: "My Decks" },
  ];

  const EXTERNAL_LINKS = [
    { href: "https://tcgdexter.beehiiv.com/", label: "TCG News" },
    { href: "https://www.tiktok.com/@tcgdexter", label: "TikTok" },
    { href: "https://www.ebay.com/usr/tcgdexter", label: "Card Shop" },
  ];

  const linkClass =
    "block py-2 text-lg font-medium text-text-secondary hover:text-text-primary transition-colors";

  const panel = (
    <div
      ref={panelRef}
      id="site-nav-panel"
      role="dialog"
      aria-label="Site navigation"
      aria-modal="true"
      className={[
        // Full-screen, solid site-gray — same as --bg so iOS chrome blends
        "fixed inset-0 z-[110] bg-bg flex flex-col",
        // Fade + slight upward slide; both directions animated
        "transition-all duration-200 ease-out",
        open
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      {/* ── Header row ── mirrors the real nav exactly (h-14, px-6, border-b)
           so there is zero visible seam when the panel opens over the header. */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-black/5">
        {/* Monogram — acts as the close trigger inside the panel */}
        <button
          onClick={close}
          aria-label="Close navigation menu"
          className="flex items-center gap-2"
        >
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#F2A20C] to-[#A60D0D] flex items-center justify-center text-[11px] font-black text-white">
            TD
          </div>
          <span className="font-semibold tracking-tight">Dexter</span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-text-muted border border-black/10 rounded-full px-2 py-0.5">
            Beta
          </span>
        </button>

        {/* Auth buttons — same styling as the real nav */}
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <Link
              href="/profile"
              onClick={close}
              className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
            >
              Profile
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                onClick={close}
                className="text-sm text-text-secondary hover:text-text-primary transition"
              >
                Sign in
              </Link>
              <Link
                href="/sign-in"
                onClick={close}
                className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-6 pt-10 pb-12 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {INTERNAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={linkClass} onClick={close}>
                {label}
              </Link>
            </li>
          ))}

          <li role="separator" className="my-4 border-t border-black/8" />

          {EXTERNAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                onClick={close}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Trigger — always visible in the real nav header */}
      <button
        ref={triggerRef}
        className="flex items-center gap-2"
        onClick={toggle}
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        aria-controls="site-nav-panel"
        aria-haspopup="dialog"
      >
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#F2A20C] to-[#A60D0D] flex items-center justify-center text-[11px] font-black text-white">
          TD
        </div>
        <span className="font-semibold tracking-tight">Dexter</span>
        <span className="ml-2 text-[10px] uppercase tracking-widest text-text-muted border border-black/10 rounded-full px-2 py-0.5">
          Beta
        </span>
      </button>

      {mounted && createPortal(panel, document.body)}
    </>
  );
}
