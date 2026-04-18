"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile-only nav overlay triggered by the TD monogram.
 * Renders as a floating dropdown card anchored just below the header —
 * deliberately NOT a full-viewport overlay, so iOS Safari never reads the
 * panel background at the screen edges and doesn't retint the browser chrome.
 */
export default function MobileNavMenu() {
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

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const NAV_LINKS = [
    { href: "/", label: "Profiler" },
    { href: "/my-decks", label: "My Decks" },
    { href: "/meta-decks", label: "Meta" },
  ];

  // Panel: fixed just below the header (top-14 = 56px = h-14 nav height).
  // Auto height — never reaches the bottom viewport edge.
  // Rendered via portal so it escapes the nav's backdrop-filter stacking context.
  const panel = (
    <div
      ref={panelRef}
      id="mobile-nav-panel"
      className={`fixed top-14 left-4 right-4 z-[110] bg-surface border-2 border-black/10 rounded-2xl shadow-sm transition-all duration-150 origin-top ${
        open
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <nav aria-label="Mobile navigation" className="p-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-xl transition"
                onClick={close}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile-only — hidden on md and up */}
      <button
        ref={triggerRef}
        className="md:hidden flex items-center gap-2"
        onClick={() => setOpen((o) => !o)}
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
