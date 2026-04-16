"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-in page — magic link flow.
 *
 * User types email, clicks "Send magic link", we call Supabase's
 * signInWithOtp(). Supabase emails a link; user clicks it; Supabase redirects
 * them to /auth/callback which finishes the exchange.
 */
function SignInForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [discordLoading, setDiscordLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam === "auth_callback_failed"
      ? "That link expired or was already used. Try again below."
      : null
  );

  async function handleDiscordSignIn() {
    setDiscordLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setDiscordLoading(false);
    }
    // On success, Supabase redirects the browser — no further action needed.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setErrorMsg("Enter a valid email.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex-shrink-0 pb-8 px-6 text-center" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}>
        <div className="flex justify-center mb-8">
          <img
            src="/logo-light.png"
            alt="TCG Dexter"
            className="max-w-full"
            style={{ width: "288px", height: "auto" }}
          />
        </div>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-sm">
          {status === "sent" ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <svg
                className="w-10 h-10 mx-auto text-accent mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Check your email
              </h2>
              <p className="text-sm text-text-secondary">
                We sent a link to <span className="font-semibold">{email}</span>.
                Click the link to sign in.
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-4 text-xs text-accent hover:text-accent-light transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "loading"}
                className="w-full rounded-lg border border-[#d0d0d0] bg-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#d0d0d0] disabled:opacity-50 [font-size:16px] sm:text-sm"
              />

              {errorMsg && (
                <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                className={`mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-5 py-3 text-sm font-semibold text-white transition-colors ${email.includes("@") ? "bg-accent hover:opacity-90" : "bg-text-primary"}`}
              >
                {status === "loading" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  "Sign in with Email"
                )}
              </button>
            </form>
          )}

          {/* Discord sign-in — shown unless the magic link was just sent */}
          {status !== "sent" && (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-text-primary" />
                <span className="text-xs text-text-muted">or</span>
                <div className="flex-1 h-px bg-text-primary" />
              </div>
              <button
                onClick={handleDiscordSignIn}
                disabled={discordLoading || status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#5865F2" }}
              >
                {discordLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                )}
                {discordLoading ? "Redirecting…" : "Sign in with Discord"}
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
