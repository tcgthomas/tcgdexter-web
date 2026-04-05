"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "system",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
}

function resolveSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("light");

  const resolve = useCallback(
    (t: Theme): "light" | "dark" => (t === "system" ? resolveSystem() : t),
    []
  );

  /* On mount: read localStorage, apply immediately */
  useEffect(() => {
    const stored = localStorage.getItem("tcgd-theme") as Theme | null;
    const initial: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "light";
    setThemeState(initial);
    applyTheme(resolve(initial));
  }, [resolve]);

  /* Re-apply when theme changes */
  useEffect(() => {
    applyTheme(resolve(theme));
  }, [theme, resolve]);

  /* Listen to OS preference changes when mode is "system" */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme(resolveSystem());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("tcgd-theme", t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
