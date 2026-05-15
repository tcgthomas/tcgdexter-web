import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Achievement keys persisted to public.user_achievements.
 *
 * Keep these stable — they are stored verbatim in the database and used
 * as the join key when rendering the profile achievements card.
 */
export const CERTIFIED_TRAINER = "certified_trainer" as const;

export type AchievementKey = typeof CERTIFIED_TRAINER;

export type EarnedAchievement = {
  key: AchievementKey;
  earned_at: string;
};

/** Returns true if the user has already earned the given achievement. */
export async function hasAchievement(
  supabase: SupabaseClient,
  userId: string,
  key: AchievementKey,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key")
    .eq("user_id", userId)
    .eq("achievement_key", key)
    .maybeSingle();
  return !!data;
}

/** Returns every achievement the given user has earned, newest first. */
export async function listAchievements(
  supabase: SupabaseClient,
  userId: string,
): Promise<EarnedAchievement[]> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });
  return ((data ?? []) as { achievement_key: string; earned_at: string }[]).map(
    (row) => ({ key: row.achievement_key as AchievementKey, earned_at: row.earned_at }),
  );
}
