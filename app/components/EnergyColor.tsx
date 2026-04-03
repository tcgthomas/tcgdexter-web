"use client";

import { useEffect } from "react";

export default function EnergyColor({ color }: { color: string }) {
  useEffect(() => {
    document.documentElement.style.setProperty("--energy-color", color);
    return () => {
      document.documentElement.style.removeProperty("--energy-color");
    };
  }, [color]);
  return null;
}
