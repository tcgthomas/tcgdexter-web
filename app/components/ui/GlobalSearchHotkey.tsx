"use client";

import { useEffect } from "react";

/**
 * Sitewide "/" hotkey for focusing the global search.
 *
 * Mounted once in the root layout. Listens for "/" on the document and
 * focuses the first visible element tagged `data-global-search-input` —
 * that's the input rendered by UnifiedSearch in the desktop right
 * sidebar (and again in the mobile nav panel footer when the menu is
 * open). Iterates because the sidebar's instance stays in the DOM at
 * `display: none` below the xl breakpoint, and we want the visible one.
 *
 * Suppression rules:
 *   - Skip if the keypress originated inside another editable surface
 *     (input / textarea / select / contenteditable). Otherwise a user
 *     typing "/" in a deck-list textarea would lose focus.
 *   - Skip if any modifier is held (Cmd, Ctrl, Alt). The bare "/" is
 *     the GitHub-style convention; combos belong to the browser /
 *     extensions.
 *   - Skip if IME composition is active (e.g. mid-conversion in
 *     Japanese / Chinese / Korean input). `e.isComposing` covers it.
 */
export default function GlobalSearchHotkey() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.isComposing) return;

      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (target instanceof HTMLElement && target.isContentEditable) return;

      // First visible match wins. `offsetParent` is null when an element
      // is `display: none` (or inside such an ancestor), which lets us
      // skip the sidebar instance on mobile and grab the panel's instead.
      // `Array.from` because the project's tsconfig target predates
      // direct NodeList iteration with `for…of`.
      const candidates = Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-global-search-input]"),
      );
      for (const el of candidates) {
        if (el.offsetParent !== null) {
          e.preventDefault();
          el.focus();
          el.select();
          return;
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
