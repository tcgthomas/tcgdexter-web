import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import ThemeMenu from "./components/ThemeMenu";
import AuroraBackground from "./components/_design/AuroraBackground";
import ExperimentNav from "./components/_design/ExperimentNav";
import ExperimentFooter from "./components/_design/ExperimentFooter";

/* Geist Sans — clean, modern typeface from Vercel */
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

/* Geist Mono — for any code/monospace elements */
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "TCG Dexter | Pokémon TCG",
  description:
    "Pokémon cards. Competitive insight. Community. Shop singles, follow the meta, and profile your deck.",
  openGraph: {
    title: "TCG Dexter | Pokémon TCG",
    description: "Pokémon cards. Competitive insight. Community.",
    url: "https://tcgdexter.com",
    siteName: "TCG Dexter",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TCG Dexter | Pokémon TCG",
    description: "Pokémon cards. Competitive insight. Community.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased text-[var(--text-primary)]`}
      >
        <ThemeProvider>
          <div className="fixed left-4 z-50" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
            <ThemeMenu />
          </div>
          <div className="min-h-dvh bg-bg text-text-primary antialiased overflow-x-hidden">
            <AuroraBackground />
            <ExperimentNav />
            {children}
            <ExperimentFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
