"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";

const OPTIONS = ["Light", "Dark", "System"] as const;
type OptionLabel = (typeof OPTIONS)[number];
const LABEL_TO_VALUE: Record<OptionLabel, "light" | "dark" | "system"> = {
  Light: "light",
  Dark: "dark",
  System: "system",
};

export default function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={panelRef} className="relative">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Theme menu"
        className="flex flex-col justify-center items-center gap-[4px] w-8 h-8 rounded-md hover:bg-white/10 transition-colors"
      >
        <span className="block w-5 h-[2px] rounded-full" style={{ backgroundColor: "rgba(240,230,214,0.7)" }} />
        <span className="block w-5 h-[2px] rounded-full" style={{ backgroundColor: "rgba(240,230,214,0.7)" }} />
        <span className="block w-5 h-[2px] rounded-full" style={{ backgroundColor: "rgba(240,230,214,0.7)" }} />
      </button>

      {/* Floating panel */}
      {open && (
        <div className="absolute right-0 top-10 flex gap-1 rounded-lg border border-border bg-surface p-1 shadow-lg">
          {OPTIONS.map((label) => {
            const value = LABEL_TO_VALUE[label];
            const active = theme === value;
            return (
              <button
                key={label}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-surface-2"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
