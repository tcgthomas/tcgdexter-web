import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Match Disputes — Admin",
};

export default async function DisputesQueuePage() {
  notFound();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _DisputesQueuePageImpl() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/admin/matches/disputes");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/");

  const { data: rows } = await supabase
    .from("shared_matches")
    .select(
      "id, creator_user_id, opponent_user_id, status, created_at, updated_at"
    )
    .eq("status", "under_review")
    .order("updated_at", { ascending: true });

  const matches = rows ?? [];
  const userIds = Array.from(
    new Set(
      matches.flatMap((m) => [m.creator_user_id, m.opponent_user_id]).filter(Boolean) as string[]
    )
  );
  const profileById = new Map<string, { display_name: string; username: string }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, {
        display_name: p.display_name,
        username: p.username,
      });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Match Disputes
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        {matches.length === 0
          ? "Nothing in the queue."
          : `${matches.length} match${matches.length === 1 ? "" : "es"} awaiting ruling.`}
      </p>

      {matches.length > 0 && (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
          {matches.map((m, i) => {
            const c = profileById.get(m.creator_user_id);
            const o = m.opponent_user_id ? profileById.get(m.opponent_user_id) : null;
            return (
              <Link
                key={m.id}
                href={`/admin/matches/${m.id}`}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-colors ${
                  i === matches.length - 1 ? "" : "border-b border-bg"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {c?.display_name ?? "Unknown"} vs {o?.display_name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Updated{" "}
                    {new Date(m.updated_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-text-muted flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
