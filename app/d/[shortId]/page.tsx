import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import DeckProfileView, {
  type AnalysisResult,
  type DeckCreator,
} from "@/app/components/DeckProfileView";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierByTitle } from "@/lib/trainer-tiers";
import QRCodeButton from "@/app/components/QRCodeButton";
import CopyDeckListButton from "@/app/components/CopyDeckListButton";

/* ─── Types ──────────────────────────────────────────────────── */

interface DeckRecord {
  deckList: string;
  profiledAt: string;
  analysis: AnalysisResult;
  userId: string | null;
}

/* ─── Supabase fetch helper ──────────────────────────────────── */

async function fetchDeck(shortId: string): Promise<DeckRecord | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deck_shares")
      .select("deck_list, analysis, created_at, user_id")
      .eq("id", shortId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      deckList: data.deck_list,
      analysis: data.analysis as AnalysisResult,
      profiledAt: data.created_at,
      userId: data.user_id,
    };
  } catch {
    return null;
  }
}

/**
 * Look up the creator's display name and trainer title via the service-role
 * client (bypasses RLS since profiles are owner-only select). Returns null
 * for anonymous shares (user_id is null) or if the lookup fails.
 */
async function fetchCreator(userId: string | null): Promise<DeckCreator | null> {
  if (!userId) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("display_name, trainer_title")
      .eq("id", userId)
      .maybeSingle();

    if (!data) return null;

    const tier = getTierByTitle(data.trainer_title ?? "Rookie Trainer");
    return {
      displayName: data.display_name ?? "Trainer",
      trainerTitle: tier.title,
      badgeSlug: tier.slug,
      tierColor: tier.color,
    };
  } catch {
    return null;
  }
}

/* ─── OG Metadata ────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shortId: string }>;
}): Promise<Metadata> {
  const { shortId } = await params;
  const deck = await fetchDeck(shortId);

  if (!deck) {
    return { title: "Deck Not Found — TCG Dexter" };
  }

  const { analysis, profiledAt } = deck;
  const title = analysis.metaMatch.archetypeName
    ? `${analysis.metaMatch.archetypeName} — TCG Dexter`
    : "Deck Analysis — TCG Dexter";

  const rotationStatus = analysis.rotation.ready
    ? "Standard Legal"
    : "Not Standard Legal";
  const pricePart =
    analysis.deckPrice > 0 ? `$${analysis.deckPrice.toFixed(2)} deck` : "";
  const archPart = analysis.metaMatch.archetypeName ?? "";
  const datePart = `Profiled ${new Date(profiledAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  )}`;
  const descParts = [rotationStatus, pricePart, archPart, datePart].filter(
    Boolean,
  );

  return {
    title,
    description: descParts.join(" · "),
    openGraph: { title, description: descParts.join(" · ") },
    twitter: {
      card: "summary_large_image",
      title,
      description: descParts.join(" · "),
    },
  };
}

/* ─── Page ───────────────────────────────────────────────────── */

export default async function SharedDeckPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const deck = await fetchDeck(shortId);

  // Resolve the canonical share URL for the QR button (no API call needed —
  // the URL is already known for a shared deck page).
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "tcgdexter.com";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const shareUrl = `${proto}://${host}/d/${shortId}`;

  if (!deck) {
    return (
      <div className="min-h-screen flex flex-col">
        <header
          className="flex-shrink-0 pb-8 px-6 text-center"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Deck Not Found
          </h1>
          <p className="mt-3 text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            This shared deck link is invalid or has expired.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 mt-6 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-light"
          >
            Profile your own deck
          </Link>
        </header>
      </div>
    );
  }

  const creator = await fetchCreator(deck.userId);

  return (
    <DeckProfileView
      deckList={deck.deckList}
      analysis={deck.analysis}
      profiledAt={deck.profiledAt}
      creator={creator ?? undefined}
      subtitle={
        <div className="flex items-center gap-2">
          <CopyDeckListButton deckList={deck.deckList} />
          <QRCodeButton shareUrl={shareUrl} />
        </div>
      }
    />
  );
}
