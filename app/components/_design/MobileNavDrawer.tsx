"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Only portal-render after mount (avoids SSR mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape key + body scroll lock when open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const overlay = (
    <>
      {/* Backdrop — covers full viewport */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-label="Site navigation"
        aria-modal="true"
        className={`fixed top-0 left-0 h-full w-64 z-[110] bg-bg shadow-2xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6 gap-6">
          {/* Drawer header */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#F2A20C] to-[#A60D0D] flex items-center justify-center text-[11px] font-black text-white">
              TD
            </div>
            <button
              ref={closeButtonRef}
              onClick={close}
              aria-label="Close navigation menu"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 transition"
            >
              {/* Inline SVG X — avoids Unicode glyph rendering issues */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav aria-label="Mobile navigation">
            <ul className="flex flex-col gap-1">
              {[
                { href: "/", label: "Profiler" },
                { href: "/my-decks", label: "My Decks" },
                { href: "/meta-decks", label: "Meta" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition"
                    onClick={close}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile-only logo button — triggers drawer instead of navigating */}
      <button
        ref={triggerRef}
        className="md:hidden flex items-center gap-2"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#F2A20C] to-[#A60D0D] flex items-center justify-center text-[11px] font-black text-white">
          TD
        </div>
        <span className="font-semibold tracking-tight">Dexter</span>
        <span className="ml-2 text-[10px] uppercase tracking-widest text-text-muted border border-black/10 rounded-full px-2 py-0.5">
          Beta
        </span>
      </button>

      {/* Portal renders backdrop + drawer at document.body level, escaping the
          nav's backdrop-filter stacking context so z-index works globally */}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
