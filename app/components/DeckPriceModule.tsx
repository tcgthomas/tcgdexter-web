"use client";

import { useState } from "react";

interface Props {
  deckPrice: number;
  deckList?: string; // needed to register the alert
}

export default function DeckPriceModule({ deckPrice, deckList }: Props) {
  const [alertEmail, setAlertEmail] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertStatus, setAlertStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleAlertSubmit() {
    if (!alertEmail.includes("@") || !alertThreshold || !deckList) return;
    setAlertStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckList,
          email: alertEmail,
          threshold: parseFloat(alertThreshold),
        }),
      });
      if (res.ok) {
        setAlertStatus("success");
      } else {
        setAlertStatus("error");
      }
    } catch {
      setAlertStatus("error");
    }
  }

  if (deckPrice <= 0) return null;

  return (
    <details className="rounded-xl border border-tan-200 bg-tan-100 p-5 backdrop-blur-sm group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="text-lg font-semibold">Estimated Deck Price</h2>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-lg font-bold text-brown-900">${deckPrice.toFixed(2)}</span>
          <svg
            className="w-4 h-4 text-brown-400 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      {/* Alert form — visible when expanded */}
      <div className="mt-4 border-t border-tan-200 pt-4">
        {alertStatus === "success" ? (
          <p className="text-sm text-green-700 font-medium">&#10003; We&apos;ll let you know!</p>
        ) : (
          <>
            <p className="text-xs text-brown-400 mb-3">Alert me when this deck drops below</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brown-400">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={alertThreshold || Math.round(deckPrice * 0.85)}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  onFocus={() => { if (!alertThreshold) setAlertThreshold(String(Math.round(deckPrice * 0.85))); }}
                  className="w-full sm:w-28 rounded-lg border border-tan-200 bg-tan-50 pl-7 pr-3 py-2 text-sm text-brown-900 focus:outline-none focus:border-energy/40 focus:ring-1 focus:ring-energy/20 [font-size:16px] sm:text-sm"
                />
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="flex-1 rounded-lg border border-tan-200 bg-tan-50 px-3 py-2 text-sm text-brown-900 placeholder:text-brown-300 focus:outline-none focus:border-energy/40 focus:ring-1 focus:ring-energy/20 [font-size:16px] sm:text-sm"
              />
              <button
                onClick={handleAlertSubmit}
                disabled={alertStatus === "loading" || !alertEmail.includes("@") || !deckList}
                className="flex-shrink-0 rounded-lg bg-energy px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-energy-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {alertStatus === "loading" ? "Saving…" : "Notify Me"}
              </button>
            </div>
            {alertStatus === "error" && (
              <p className="text-xs text-red-600 mt-2">Something went wrong, try again.</p>
            )}
          </>
        )}
      </div>
    </details>
  );
}
