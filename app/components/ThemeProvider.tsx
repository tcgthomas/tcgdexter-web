"use client";

import { createContext, useContext } from "react";

interface ThemeCtx {
  theme: "light";
  setTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}
