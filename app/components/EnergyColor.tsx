"use client";

import { useEffect } from "react";

// Accepts the raw energy hex and blends it at 20% over the actual bg
// (matches the profiler's mutedColor logic; reads data-theme for light/dark correctness)
export default function EnergyColor({ hex }: { hex: string }) {
  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const bg = isDark ? [24, 19, 15] : [253, 248, 242];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = 0.20;
    const muted = `rgb(${Math.round(r*a + bg[0]*(1-a))},${Math.round(g*a + bg[1]*(1-a))},${Math.round(b*a + bg[2]*(1-a))})`;
    document.documentElement.style.setProperty("--energy-color", muted);
    document.documentElement.classList.add("gradient-active");
    return () => {
      document.documentElement.style.removeProperty("--energy-color");
      document.documentElement.classList.remove("gradient-active");
    };
  }, [hex]);
  return null;
}
