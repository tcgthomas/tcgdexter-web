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
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam === "auth_callback_failed"
      ? "That link expired or was already used. Try again below."
      : null
  );

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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Sign in
        </h1>
        <p className="mt-3 text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
          We&apos;ll send you a link to sign in. No password needed.
        </p>
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
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "loading"}
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 disabled:opacity-50 [font-size:16px] sm:text-sm"
              />

              {errorMsg && (
                <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !email.includes("@")}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed"
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
                  "Sign In"
                )}
              </button>
            </form>
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
