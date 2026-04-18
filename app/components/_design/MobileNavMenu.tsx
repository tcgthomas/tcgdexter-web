"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Universal nav dropdown triggered by the TD monogram — mobile AND desktop.
 *
 * On mobile  : panel spans left-4/right-4 (full-width-minus-gutter).
 * On desktop : panel is anchored to the monogram's left edge (via
 *              getBoundingClientRect on open) and capped at w-52.
 *
 * Rendered via portal so it escapes the nav's backdrop-filter stacking
 * context. No full-viewport backdrop — "click outside" uses a pointerdown
 * document listener so iOS Safari never reads a gray overlay at the
 * screen edges and doesn't retint the browser chrome.
 */
export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Desktop: panel left edge anchored to the monogram; null = mobile layout.
  const [desktopLeft, setDesktopLeft] = useState<number | null>(null);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape key + pointer-down outside panel
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    };

    // Move focus into the panel's first link
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      // On desktop (md+), anchor panel to the button's left edge.
      if (window.matchMedia("(min-width: 768px)").matches) {
        setDesktopLeft(triggerRef.current.getBoundingClientRect().left);
      } else {
        setDesktopLeft(null);
      }
    }
    setOpen((o) => !o);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const INTERNAL_LINKS = [
    { href: "/", label: "Create a Deck Profile" },
    { href: "/my-decks", label: "My Decks" },
    { href: "/meta-decks", label: "Top 30 Meta Decks" },
  ];

  const EXTERNAL_LINKS = [
    { href: "https://tcgdexter.beehiiv.com/", label: "TCG News" },
    { href: "https://www.tiktok.com/@tcgdexter", label: "TikTok" },
    { href: "https://www.ebay.com/usr/tcgdexter", label: "Card Shop" },
  ];

  const linkClass =
    "flex items-center px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-xl transition";

  const panel = (
    <div
      ref={panelRef}
      id="mobile-nav-panel"
      style={desktopLeft !== null ? { left: desktopLeft } : undefined}
      className={[
        "fixed top-14 z-[110] bg-surface border-2 border-black/10 rounded-2xl shadow-sm",
        "transition-all duration-150 origin-top",
        // Mobile: full-width-minus-gutter; Desktop: anchored width
        desktopLeft !== null ? "w-52" : "left-4 right-4",
        open
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-95 pointer-events-none",
      ].join(" ")}
    >
      <nav aria-label="Site navigation" className="p-2">
        <ul className="flex flex-col gap-0.5">
          {INTERNAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={linkClass} onClick={close}>
                {label}
              </Link>
            </li>
          ))}

          {/* Divider between app sections and external links */}
          <li role="separator" className="my-1 border-t border-black/8" />

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
      {/* Trigger — visible on ALL breakpoints (mobile + desktop) */}
      <button
        ref={triggerRef}
        className="flex items-center gap-2"
        onClick={toggle}
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-haspopup="true"
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
