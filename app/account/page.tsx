import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TRAINER_TIERS, getTierByTitle, getNextTier } from "@/lib/trainer-tiers";
import EditDisplayName from "./EditDisplayName";
import SignOutButton from "./SignOutButton";

/**
 * Account page — shows the signed-in user's profile, trainer progression,
 * and a sign-out button. Redirects to /sign-in if not authenticated.
 */
export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, tier, trainer_title, highest_deck_count, created_at")
    .eq("id", user.id)
    .single();

  const currentTitle = profile?.trainer_title ?? "Rookie Trainer";
  const highWaterMark = profile?.highest_deck_count ?? 0;
  const currentTier = getTierByTitle(currentTitle);
  const nextTier = getNextTier(highWaterMark);

  // Global match record
  const { data: matchStats } = await supabase
    .from("matches")
    .select("result");

  const globalWins = matchStats?.filter((m) => m.result === "win").length ?? 0;
  const globalLosses = matchStats?.filter((m) => m.result === "loss").length ?? 0;
  const globalDraws = matchStats?.filter((m) => m.result === "draw").length ?? 0;
  const globalTotal = globalWins + globalLosses + globalDraws;
  const globalWinRate = globalTotal > 0 ? ((globalWins / globalTotal) * 100).toFixed(1) : null;

  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="flex-shrink-0 pb-8 px-6 text-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Account
        </h1>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-sm">
          {/* ── User info ────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <EditDisplayName initialName={profile?.display_name ?? "—"} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row
              label="Joined"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"
              }
              last
            />
          </div>

          {/* ── Current trainer title ────────────────────────── */}
          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-4">
              <img
                src={`/badges/${currentTier.slug}.svg`}
                alt={currentTier.title}
                className="w-14 h-14 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Trainer Title
                </p>
                <p className={`text-lg font-bold ${currentTier.color}`}>
                  {currentTier.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {highWaterMark} deck{highWaterMark !== 1 ? "s" : ""} saved
                </p>
              </div>
            </div>

            {/* Progress to next tier */}
            {nextTier && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span>Next: {nextTier.title}</span>
                  <span>
                    {highWaterMark} / {nextTier.threshold}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${Math.min(
                        (highWaterMark / nextTier.threshold) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  {nextTier.threshold - highWaterMark} more deck
                  {nextTier.threshold - highWaterMark !== 1 ? "s" : ""} to
                  unlock
                </p>
              </div>
            )}
          </div>

          {/* ── Tier progression ladder ──────────────────────── */}
          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Trainer Progression
            </h2>
            <div className="flex flex-col gap-1">
              {TRAINER_TIERS.map((tier, i) => {
                const earned = highWaterMark >= tier.threshold;
                const isCurrent = tier.title === currentTitle;
                return (
                  <div
                    key={tier.slug}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isCurrent
                        ? `${tier.bgColor} border ${tier.borderColor}`
                        : earned
                          ? "bg-surface-2"
                          : ""
                    }`}
                  >
                    <img
                      src={`/badges/${tier.slug}.svg`}
                      alt={tier.title}
                      className={`w-8 h-8 flex-shrink-0 transition-opacity ${
                        earned ? "opacity-100" : "opacity-25 grayscale"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          earned ? tier.color : "text-text-muted"
                        }`}
                      >
                        {tier.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {tier.threshold} deck{tier.threshold !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-accent">
                        Current
                      </span>
                    )}
                    {earned && !isCurrent && (
                      <svg
                        className="w-4 h-4 text-green-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                    {!earned && (
                      <svg
                        className="w-4 h-4 text-text-muted/30 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Global match record ─────────────────────────── */}
          {globalTotal > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-3">
                Overall Record
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-lg">
                  <span className="font-bold text-green-700">{globalWins}W</span>
                  <span className="text-text-muted">-</span>
                  <span className="font-bold text-red-700">{globalLosses}L</span>
                  {globalDraws > 0 && (
                    <>
                      <span className="text-text-muted">-</span>
                      <span className="font-bold text-stone-600">{globalDraws}D</span>
                    </>
                  )}
                </div>
                {globalWinRate && (
                  <span className="text-sm text-text-muted">
                    {globalWinRate}% win rate
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-2">
                {globalTotal} match{globalTotal !== 1 ? "es" : ""} across all decks
              </p>
            </div>
          )}

          {/* ── Sign out ─────────────────────────────────────── */}
          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}

function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}
