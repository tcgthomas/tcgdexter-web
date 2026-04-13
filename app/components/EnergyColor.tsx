"use client";

import { useEffect } from "react";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function EnergyColor({ hex }: { hex: string }) {
  useEffect(() => {
    const color = hexToRgba(hex, 0.4);
    document.documentElement.style.setProperty("--energy-color", color);
    document.documentElement.classList.add("gradient-active");
    return () => {
      document.documentElement.style.removeProperty("--energy-color");
      document.documentElement.classList.remove("gradient-active");
    };
  }, [hex]);

  return null;
}
