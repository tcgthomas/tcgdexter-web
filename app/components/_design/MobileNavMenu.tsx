"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Must match the CSS transition-duration on the panel div below. */
const TRANSITION_MS = 200;

interface Props {
  /** Passed from the server component so auth buttons render correctly. */
  isAuthed: boolean;
}

/**
 * Full-screen nav takeover triggered by the TD monogram.
 *
 * State model
 * ───────────
 * isOpen    — drives CSS open/closed classes. Flipping this triggers the
 *             CSS transition. Never flip it on the same frame as a DOM
 *             insertion — use double-rAF on enter.
 * isVisible — drives portal mount/unmount. True while the panel is visible
 *             OR still animating out. Unmounted only after the exit transition
 *             finishes (via setTimeout matched to TRANSITION_MS).
 *
 * Scroll lock
 * ───────────
 * Sets overflow:hidden on <html> and <body> (plus touch-action:none on body)
 * while the panel is open. No position:fixed, no top:-scrollY, no scrollTo —
 * so there is zero layout shift on open or close. scrollLockedRef guards
 * against double-lock/unlock so unlockScroll() is safe from any code path.
 */
export default function MobileNavMenu({ isAuthed }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll-lock state
  const prevHtmlOverflowRef = useRef("");
  const prevBodyOverflowRef = useRef("");
  const prevBodyTouchActionRef = useRef("");
  const scrollLockedRef = useRef(false);

  // Pending animation handles
  const rafRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll lock helpers ──────────────────────────────────────────────────────

  const lockScroll = () => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    const html = document.documentElement;
    prevHtmlOverflowRef.current = html.style.overflow;
    prevBodyOverflowRef.current = document.body.style.overflow;
    prevBodyTouchActionRef.current = document.body.style.touchAction;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  };

  const unlockScroll = () => {
    if (!scrollLockedRef.current) return;
    scrollLockedRef.current = false;
    document.documentElement.style.overflow = prevHtmlOverflowRef.current;
    document.body.style.overflow = prevBodyOverflowRef.current;
    document.body.style.touchAction = prevBodyTouchActionRef.current;
  };

  // ── Open / close ─────────────────────────────────────────────────────────────

  const openMenu = () => {
    // Cancel any in-flight close
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    cancelAnimationFrame(rafRef.current);

    lockScroll();
    // 1. Mount portal: panel is in DOM but still in closed CSS state.
    setIsVisible(true);
    // 2. Double rAF: browser has now painted the closed state, so the CSS
    //    transition has a valid starting point and won't flash.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setIsOpen(true);
      });
    });
  };

  const closeMenu = () => {
    cancelAnimationFrame(rafRef.current);
    unlockScroll();
    // Flip CSS to closed — transition animates out.
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
    // Unmount portal only after the exit animation finishes.
    closeTimerRef.current = setTimeout(
      () => setIsVisible(false),
      TRANSITION_MS,
    );
  };

  const toggle = () => {
    // Guard mid-open-animation state with scrollLockedRef (isOpen is still
    // false during the double-rAF window, but the lock is already set).
    if (isOpen || scrollLockedRef.current) closeMenu();
    else openMenu();
  };

  // ── Side effects ─────────────────────────────────────────────────────────────

  // Route change: close menu if it was open or mid-animation.
  useEffect(() => {
    if (!scrollLockedRef.current && !isOpen) return;
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Bulletproof unmount cleanup — releases scroll lock even if the component
  // tree unmounts while the menu is open (e.g. hard navigation).
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      unlockScroll();
      document.body.removeAttribute("data-nav-menu-visible");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide the real sticky toolbar whenever the panel is mounted. The panel's
  // header row is a pixel-perfect replica (same bg-bg/70 backdrop-blur-xl
  // and border), so the swap is invisible — but leaving both rendered at
  // once makes their borders composite during the body's opacity fade,
  // producing a ~1-2px divider jitter on open/close. CSS selector lives
  // in globals.css: body[data-nav-menu-visible] nav[data-site-toolbar].
  useEffect(() => {
    if (isVisible) {
      document.body.setAttribute("data-nav-menu-visible", "");
    } else {
      document.body.removeAttribute("data-nav-menu-visible");
    }
  }, [isVisible]);

  // Escape key + Tab focus trap (active only while open).
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    // Move focus into panel immediately.
    getFocusable()[0]?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusable();
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus({ preventScroll: true });
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus({ preventScroll: true });
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Nav link data ─────────────────────────────────────────────────────────────

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

  // ── Panel (rendered into a portal at document.body) ──────────────────────────

  const panel = (
    <div
      ref={panelRef}
      id="site-nav-panel"
      role="dialog"
      aria-label="Site navigation"
      aria-modal="true"
      className={[
        // Full-screen takeover. overscroll-contain prevents momentum scroll
        // bleeding to the page behind on iOS Safari.
        "fixed inset-0 z-[110] flex flex-col overscroll-contain",
        // pointer-events toggles with isOpen so the page under the fading-
        // out body isn't interactable mid-transition.
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
    >
      {/* Header row — styling mirrors the real toolbar exactly (matching
          bg-bg/70 backdrop-blur-xl and border). ALWAYS at full opacity,
          never fades. This avoids the real toolbar's border and this
          replica's border compositing at partial alpha during a fade —
          which produced a ~1-2px divider jitter on open/close. Pair with
          the data-nav-menu-visible attribute below that hides the real
          toolbar, so only one toolbar is ever rendered at a time. */}
      <div className="flex-shrink-0 backdrop-blur-xl bg-bg/70 border-b border-black/5">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          {/* Monogram — tapping it closes the menu */}
          <button
            onClick={closeMenu}
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

          {/* Auth buttons — same styling as the real nav header */}
          <div className="flex items-center gap-3">
            {isAuthed ? (
              <Link
                href="/profile"
                onClick={closeMenu}
                className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
              >
                Profile
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="text-sm text-text-secondary hover:text-text-primary transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="text-sm font-medium bg-black text-white rounded-full px-4 py-1.5 hover:bg-black/85 transition"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nav body — bg + links fade as a unit. At opacity 0 the page
          content is visible beneath; at opacity 1 the takeover is fully
          opaque. Header above stays fixed, so the divider never flickers. */}
      <div
        className={[
          "flex-1 bg-bg overflow-y-auto",
          "transition-opacity duration-200 ease-out",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <nav className="mx-auto max-w-6xl px-6 pt-10 pb-12">
          <ul className="flex flex-col gap-1">
            {INTERNAL_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkClass} onClick={closeMenu}>
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
                  onClick={closeMenu}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );

  // ── Trigger + portal ──────────────────────────────────────────────────────────

  return (
    <>
      <button
        ref={triggerRef}
        className="flex items-center gap-2"
        onClick={toggle}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
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

      {isVisible && createPortal(panel, document.body)}
    </>
  );
}
