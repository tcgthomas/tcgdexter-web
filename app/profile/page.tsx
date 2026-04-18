import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TRAINER_TIERS, getTierByTitle, getNextTier } from "@/lib/trainer-tiers";
import EditDisplayName from "@/app/profile/EditDisplayName";
import SignOutButton from "@/app/profile/SignOutButton";
import SectionHeader from "@/app/components/ui/SectionHeader";

/**
 * Experiment mirror of /profile. Same auth + Supabase queries, same
 * client components (EditDisplayName, SignOutButton). Panels get the
 * glass-card treatment; functionality is identical to prod.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, tier, trainer_title, highest_deck_count, created_at")
    .eq("id", user.id)
    .single();

  const currentTitle = profile?.trainer_title ?? "Rookie Trainer";
  const highWaterMark = profile?.highest_deck_count ?? 0;
  const currentTier = getTierByTitle(currentTitle);
  const nextTier = getNextTier(highWaterMark);

  const { data: matchStats } = await supabase.from("matches").select("result");
  const globalWins = matchStats?.filter((m) => m.result === "win").length ?? 0;
  const globalLosses = matchStats?.filter((m) => m.result === "loss").length ?? 0;
  const globalDraws = matchStats?.filter((m) => m.result === "draw").length ?? 0;
  const globalTotal = globalWins + globalLosses + globalDraws;
  const globalWinRate = globalTotal > 0 ? ((globalWins / globalTotal) * 100).toFixed(1) : null;

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="mb-8">
        <SectionHeader eyebrow="Account" title="Profile" />
      </div>

      {/* User info */}
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
        <EditDisplayName initialName={profile?.display_name ?? "—"} />
        <Row label="Email" value={user.email ?? "—"} />
        <Row
          label="Joined"
          value={
            profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })
              : "—"
          }
          last
        />
      </div>

      {/* Current trainer title */}
      <div className="mt-6 rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
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

        {nextTier && (
          <div className="mt-4 pt-4 border-t border-black/5">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2">
              <span>Next: {nextTier.title}</span>
              <span>{highWaterMark} / {nextTier.threshold}</span>
            </div>
            <div className="h-2 rounded-full bg-black/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)] transition-all"
                style={{
                  width: `${Math.min((highWaterMark / nextTier.threshold) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              {nextTier.threshold - highWaterMark} more deck
              {nextTier.threshold - highWaterMark !== 1 ? "s" : ""} to unlock
            </p>
          </div>
        )}
      </div>

      {/* Tier progression ladder */}
      <div className="mt-6 rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Trainer Progression</h2>
        <div className="flex flex-col gap-1">
          {TRAINER_TIERS.map((tier) => {
            const earned = highWaterMark >= tier.threshold;
            const isCurrent = tier.title === currentTitle;
            return (
              <div
                key={tier.slug}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isCurrent
                    ? `${tier.bgColor} border ${tier.borderColor}`
                    : earned
                      ? "bg-black/5"
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
                  <p className={`text-sm font-semibold ${earned ? tier.color : "text-text-muted"}`}>
                    {tier.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {tier.threshold} deck{tier.threshold !== 1 ? "s" : ""}
                  </p>
                </div>
                {isCurrent && (
                  <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-[#D91E0D]">
                    Current
                  </span>
                )}
                {earned && !isCurrent && (
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {!earned && (
                  <svg className="w-4 h-4 text-text-muted/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Global match record */}
      {globalTotal > 0 && (
        <div className="mt-6 rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Overall Record</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-lg">
              <span className="font-bold text-emerald-700">{globalWins}W</span>
              <span className="text-text-muted">-</span>
              <span className="font-bold text-rose-700">{globalLosses}L</span>
              {globalDraws > 0 && (
                <>
                  <span className="text-text-muted">-</span>
                  <span className="font-bold text-stone-600">{globalDraws}D</span>
                </>
              )}
            </div>
            {globalWinRate && (
              <span className="text-sm text-text-muted">{globalWinRate}% win rate</span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-2">
            {globalTotal} match{globalTotal !== 1 ? "es" : ""} across all decks
          </p>
        </div>
      )}

      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
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
      className={`flex items-center justify-between px-5 py-3.5 ${last ? "" : "border-b border-black/5"}`}
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}
