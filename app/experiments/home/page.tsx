"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import DeckProfileView, {
  type AnalysisResult,
} from "@/app/components/DeckProfileView";
import SectionHeader from "../_design/SectionHeader";
import GradientButton from "../_design/GradientButton";
import StatsStrip from "../_design/StatsStrip";

const EXAMPLE_DECK = `Pokémon: 8
4 Marnie's Impidimp DRI 134
2 Pecharunt ex SFA 39
2 Munkidori SFA 72
1 Fezandipiti ex ASC 288
2 Marnie's Grimmsnarl ex ASC 287
2 Okidogi ex SFA 82
1 Marnie's Grimmsnarl ex DRI 136
2 Marnie's Morgrem DRI 135

Trainer: 15
3 Boss's Orders PAL 265
3 Brock's Scouting JTG 179
2 Black Belt's Training ASC 255
1 Night Stretcher MEG 173
3 Spikemuth Gym DRI 169
2 Rare Candy MEG 175
1 Night Stretcher SSP 251
3 Energy Switch MEG 115
2 Punk Helmet PFL 92
2 Janine's Secret Art PRE 173
1 Janine's Secret Art SFA 88
1 Secret Box TWM 163
2 Team Rocket's Petrel DRI 226
3 Lillie's Determination MEG 184
3 Binding Mochi SFA 55

Energy: 1
12 Basic {D} Energy MEE 7

Total Cards: 60`;

const STATS = [
  { label: "Decks profiled", value: "48,212" },
  { label: "Matches logged", value: "12,806" },
];

const META_PREVIEW = [
  { name: "Charizard ex", share: "14.2%", trend: "+2.1" },
  { name: "Gardevoir ex", share: "11.8%", trend: "+0.4" },
  { name: "Lost Box", share: "9.1%", trend: "-1.3" },
  { name: "Miraidon ex", share: "7.6%", trend: "+0.9" },
];

export default function ExperimentalHomePage() {
  const [deckList, setDeckList] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [profiledAt, setProfiledAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const profileAnchor = useRef<HTMLDivElement>(null);

  async function handleAnalyze() {
    if (!deckList.trim()) {
      setError("Paste your deck list first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed.");
      } else {
        setResult(data as AnalysisResult);
        setProfiledAt(new Date().toISOString());
        // Smooth-scroll the new profile into view.
        requestAnimationFrame(() => {
          profileAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo-light.png"
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "240px", height: "auto" }}
          />
        </div>

        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02] max-w-4xl mx-auto">
          The deckbuilder&apos;s
          <br />
          <span className="bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] bg-clip-text text-transparent">
            dex for Pokémon TCG.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl font-semibold text-text-primary max-w-2xl mx-auto leading-relaxed">
          Paste your list to create a Deck Profile.
          <br />
          Save to take notes and track performance.
        </p>

        {/* Deck input card — soft elevated glass on light bg */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="relative group">
            {/* Gradient glow */}
            <div className="absolute -inset-px rounded-2xl bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] opacity-30 group-focus-within:opacity-70 blur-xl transition-opacity" />
            <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-black/5 p-2 shadow-[0_20px_60px_-15px_rgba(217,30,13,0.3)]">
              <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
                <span className="text-xs font-semibold text-text-primary">Deck List</span>
                <button
                  onClick={() => setDeckList(EXAMPLE_DECK)}
                  className="text-xs text-text-muted hover:text-text-primary transition"
                >
                  Load example
                </button>
              </div>
              <textarea
                value={deckList}
                onChange={(e) => setDeckList(e.target.value)}
                placeholder="Pokémon: 12&#10;4 Charizard ex OBF 125&#10;2 Charmander OBF 26&#10;..."
                className="w-full h-48 bg-transparent resize-none px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted/60 outline-none"
                spellCheck={false}
              />
              <div className="flex items-center justify-end gap-3 px-2 pb-2">
                {deckList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeckList("")}
                    className="text-xs text-text-muted hover:text-text-primary transition"
                  >
                    Clear
                  </button>
                )}
                <GradientButton onClick={handleAnalyze} disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Profiling…
                    </>
                  ) : (
                    "Profile this deck"
                  )}
                </GradientButton>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Anchor used to scroll the new profile into view after analysis. */}
      <div ref={profileAnchor} />

      {result && profiledAt ? (
        <DeckProfileView
          deckList={deckList}
          analysis={result}
          profiledAt={profiledAt}
          subtitle={false}
          hideLogo
          theme="experiments"
        />
      ) : (
        <>
          {/* How it works */}
          <section className="mx-auto max-w-6xl px-6 py-24">
            <div className="mb-16">
              <SectionHeader eyebrow="The flow" title="From list to lineup, in seconds." align="center" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { n: "01", t: "Paste", b: "Drop any PTCGL export, TOM list, or scratch-pad brew." },
                { n: "02", t: "Profile", b: "Dexter runs legality, pricing, and meta match in parallel." },
                { n: "03", t: "Play", b: "Save, share via QR, and log matches to see what's actually working." },
              ].map((step) => (
                <div
                  key={step.n}
                  className="relative rounded-2xl border border-black/8 bg-white/60 backdrop-blur-sm p-6 hover:bg-white/90 hover:shadow-lg transition"
                >
                  <div className="text-xs font-mono text-text-muted mb-4">{step.n}</div>
                  <div className="text-xl font-semibold tracking-tight mb-2">{step.t}</div>
                  <div className="text-sm text-text-secondary leading-relaxed">{step.b}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats strip */}
          <section className="mx-auto max-w-2xl px-6 pb-24">
            <StatsStrip stats={STATS} />
          </section>

          {/* Meta ticker */}
          <section className="mx-auto max-w-6xl px-6 py-24">
            <div className="rounded-3xl border border-black/8 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm p-8 md:p-12 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#D91E0D] mb-3 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff8a3d] opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff8a3d]" />
                    </span>
                    Live meta
                  </div>
                  <h2 className="text-4xl font-semibold tracking-tight">This week&apos;s top archetypes.</h2>
                </div>
                <Link
                  href="/experiments/meta-decks"
                  className="text-sm text-text-secondary hover:text-text-primary transition self-start md:self-auto"
                >
                  View full meta report →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {META_PREVIEW.map((d, i) => (
                  <div key={d.name} className="rounded-xl border border-black/8 bg-white p-4 shadow-sm">
                    <div className="text-xs text-text-muted mb-2">#{i + 1}</div>
                    <div className="font-semibold tracking-tight mb-3">{d.name}</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold">{d.share}</span>
                      <span className={`text-xs font-mono ${d.trend.startsWith("+") ? "text-emerald-600" : "text-rose-600"}`}>
                        {d.trend}
                      </span>
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className="h-full bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)]"
                        style={{ width: `${parseFloat(d.share)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonial */}
          <section className="mx-auto max-w-4xl px-6 py-24 text-center">
            <div className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-text-primary">
              <span className="text-text-muted">&ldquo;</span>
              I used to have five tabs open to profile a new brew. Now I paste once and I&apos;m playing a ladder game two minutes later.
              <span className="text-text-muted">&rdquo;</span>
            </div>
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#F2A20C_0%,#A60D0D_100%)]" />
              <div className="text-left">
                <div className="font-semibold text-text-primary">Regional Top 8, 2026 Season</div>
                <div className="text-text-muted">Verified tournament player</div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="mx-auto max-w-5xl px-6 pb-32">
            <div className="relative rounded-3xl overflow-hidden border border-black/8 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff8a3d]/15 via-[#ffd3a8]/20 to-[#c4b5fd]/20" />
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 20%, rgba(255, 138, 61, 0.35) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(196, 181, 253, 0.35) 0%, transparent 50%)",
                }}
              />
              <div className="relative p-12 md:p-20 text-center">
                <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto text-text-primary">
                  Ready to see what your deck is really made of?
                </h2>
                <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto">
                  Free forever for your first 10 profiles. No card, no catch, no email spam.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/experiments/home"
                    className="rounded-xl bg-black text-white font-semibold px-6 py-3 hover:bg-black/85 transition shadow-lg"
                  >
                    Profile a deck now
                  </Link>
                  <Link
                    href="/experiments/meta-decks"
                    className="rounded-xl border border-black/15 bg-white/80 backdrop-blur-sm text-text-primary font-semibold px-6 py-3 hover:bg-white transition"
                  >
                    Browse the meta →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
