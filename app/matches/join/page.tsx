import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import JoinCodeForm, { type JoinDeck } from "./JoinCodeForm";

export const metadata: Metadata = {
  title: "Join Match — TCG Dexter",
  description: "Enter a match code to join a verified match.",
};

export default async function JoinMatchPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/matches/join");

  const { data: decksRaw } = await supabase
    .from("saved_decks")
    .select("id, name, analysis, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const decks: JoinDeck[] = (decksRaw ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    archetype:
      ((d.analysis as { metaMatch?: { archetypeName?: string | null } } | null)
        ?.metaMatch?.archetypeName) ?? null,
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Join a match
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Enter the code from your opponent.
      </p>

      <JoinCodeForm decks={decks} />
    </main>
  );
}
