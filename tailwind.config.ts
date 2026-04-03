import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic design tokens (mapped to CSS custom properties)
        bg:      "var(--bg)",
        surface: { DEFAULT: "var(--surface)", 2: "var(--surface-2)" },
        border:  "var(--border)",
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted":     "var(--text-muted)",
        accent: {
          DEFAULT: "var(--accent)",
          light:   "var(--accent-light)",
          dark:    "var(--accent-dark)",
        },
        // Warm tan backgrounds
        tan: {
          50:  "#fdf8f2",
          100: "#f5ede0",
          200: "#ecdcc8",
          300: "#d9c4a8",
          400: "#b89d7e",
        },
        // Deep warm brown for text
        brown: {
          900: "#2c1f0e",
          700: "#5c3d1e",
          500: "#8b6040",
          300: "#b89d7e",
        },
        // Energy accent — deeper/warmer for light bg readability
        energy: {
          DEFAULT: "#c0392b",
          light:   "#e74c3c",
          dark:    "#922b21",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
