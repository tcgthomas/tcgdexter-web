"use client";

import { useEffect } from "react";

export default function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
    return () => { meta!.content = ""; };
  }, [color]);
  return null;
}
