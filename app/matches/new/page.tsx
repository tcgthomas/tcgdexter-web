import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import MatchDeckPicker, { type PickerDeck } from "./MatchDeckPicker";

export const metadata: Metadata = {
  title: "New Match — TCG Dexter",
  description: "Co-record a match with another trainer.",
};

export default async function NewMatchPage() {
  notFound();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _NewMatchPageImpl() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/matches/new");

  const { data: decksRaw } = await supabase
    .from("saved_decks")
    .select("id, name, analysis, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const decks: PickerDeck[] = (decksRaw ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    archetype:
      ((d.analysis as { metaMatch?: { archetypeName?: string | null } } | null)
        ?.metaMatch?.archetypeName) ?? null,
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Start a verified match
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Pick the deck you played, then share the code with your opponent.
      </p>

      {decks.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-8 text-center">
          <p className="text-sm text-text-secondary">
            You need a saved deck to start a match.{" "}
            <Link href="/" className="text-accent hover:underline">
              Profile a deck →
            </Link>
          </p>
        </div>
      ) : (
        <MatchDeckPicker decks={decks} />
      )}
    </main>
  );
}
