import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeckProfileView, {
  type AnalysisResult,
} from "@/app/components/DeckProfileView";

/**
 * Private saved-deck profile view.
 *
 * Renders a user's saved deck in the same layout as the public shared-deck
 * page (/d/[shortId]), but pulls the row from public.saved_decks. RLS
 * enforces owner-only access — if the caller doesn't own the deck, the
 * select returns no rows and we 404. Unauthenticated users get redirected
 * to /sign-in.
 */
export default async function MyDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: deck } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!deck) {
    notFound();
  }

  const analysis = deck.analysis as AnalysisResult | null;
  if (!analysis) {
    // Defensive: a saved deck without analysis shouldn't exist, but if one
    // slips through (e.g. from a future import path), route back to My Decks
    // rather than crashing in the renderer.
    redirect("/my-decks");
  }

  const updatedStr = new Date(deck.updated_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DeckProfileView
      deckList={deck.deck_list}
      analysis={analysis}
      profiledAt={deck.updated_at}
      pageTitle={deck.name}
      subtitle={`Saved · Last updated ${updatedStr}`}
      footerCta={
        <Link
          href="/my-decks"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:bg-surface-2"
        >
          Back to My Decks
        </Link>
      }
    />
  );
}
