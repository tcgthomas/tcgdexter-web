"use client";

import { useEffect } from "react";
import { useTheme } from "./ThemeProvider";

function computeMuted(hex: string, isDark: boolean): string {
  const bg = isDark ? [24, 19, 15] : [253, 248, 242];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = 0.20;
  return `rgb(${Math.round(r*a + bg[0]*(1-a))},${Math.round(g*a + bg[1]*(1-a))},${Math.round(b*a + bg[2]*(1-a))})`;
}

export default function EnergyColor({ hex }: { hex: string }) {
  const { theme } = useTheme();

  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const muted = computeMuted(hex, isDark);
    document.documentElement.style.setProperty("--energy-color", muted);
    document.documentElement.classList.add("gradient-active");
    return () => {
      document.documentElement.style.removeProperty("--energy-color");
      document.documentElement.classList.remove("gradient-active");
    };
  }, [hex, theme]);

  return null;
}
