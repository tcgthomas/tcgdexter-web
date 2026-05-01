import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

// Revalidate the home page (and its stat counts) at most once per minute.
export const revalidate = 60;

export type TopTrainer = {
  id: string;
  display_name: string;
  username: string;
  trainer_title: string | null;
  totalLikes: number;
  deckCount: number;
};

async function loadTopTrainers(): Promise<TopTrainer[]> {
  try {
    const supabase = await createClient();
    const { data: decks } = await supabase
      .from("saved_decks")
      .select("user_id, like_count")
      .eq("is_public", true);
    if (!decks?.length) return [];

    const totals = new Map<string, { totalLikes: number; deckCount: number }>();
    for (const d of decks) {
      const prev = totals.get(d.user_id) ?? { totalLikes: 0, deckCount: 0 };
      totals.set(d.user_id, {
        totalLikes: prev.totalLikes + (d.like_count ?? 0),
        deckCount: prev.deckCount + 1,
      });
    }

    const topIds = Array.from(totals.entries())
      .sort((a, b) => b[1].totalLikes - a[1].totalLikes)
      .slice(0, 3)
      .map(([id]) => id);
    if (!topIds.length) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, trainer_title")
      .in("id", topIds)
      .eq("is_public", true)
      .not("username", "is", null);
    if (!profiles?.length) return [];

    return profiles
      .map((p) => ({ ...p, ...(totals.get(p.id) ?? { totalLikes: 0, deckCount: 0 }) }))
      .sort((a, b) => b.totalLikes - a.totalLikes) as TopTrainer[];
  } catch {
    return [];
  }
}

async function loadStats(): Promise<Array<{ label: string; value: string }>> {
  const format = (n: number | null) =>
    n == null ? "—" : n.toLocaleString("en-US");

  try {
    const admin = createAdminClient();
    const [decksRes, matchesRes] = await Promise.all([
      admin
        .from("analysis_submissions")
        .select("id", { count: "exact", head: true }),
      admin.from("matches").select("id", { count: "exact", head: true }),
    ]);

    if (decksRes.error) {
      console.error("[home/stats] analysis_submissions count failed:", decksRes.error);
    }
    if (matchesRes.error) {
      console.error("[home/stats] matches count failed:", matchesRes.error);
    }

    return [
      { label: "Decks profiled", value: format(decksRes.error ? null : decksRes.count) },
      { label: "Matches logged", value: format(matchesRes.error ? null : matchesRes.count) },
    ];
  } catch (err) {
    console.error("[home/stats] admin client unavailable:", err);
    return [
      { label: "Decks profiled", value: "—" },
      { label: "Matches logged", value: "—" },
    ];
  }
}

export default async function DeckProfilerPage() {
  const [stats, topTrainers] = await Promise.all([loadStats(), loadTopTrainers()]);
  return <HomeClient stats={stats} topTrainers={topTrainers} />;
}
