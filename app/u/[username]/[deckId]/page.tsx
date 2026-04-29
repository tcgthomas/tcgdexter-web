import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeckProfileView, {
  type AnalysisResult,
  type DeckCreator,
} from "@/app/components/DeckProfileView";
import { createClient } from "@/lib/supabase/server";
import { getTierByTitle } from "@/lib/trainer-tiers";
import { repriceDeck } from "@/lib/reprice-deck";
import CopyDeckListButton from "@/app/components/CopyDeckListButton";
import LikeButton from "@/app/components/LikeButton";

interface PublicDeckRecord {
  id: string;
  name: string;
  deck_list: string;
  analysis: AnalysisResult;
  updated_at: string;
  user_id: string;
  like_count: number;
}

interface OwnerProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  trainer_title: string | null;
}

async function fetchOwner(username: string): Promise<OwnerProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, trainer_title, is_public")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();
  if (!data) return null;
  return data as OwnerProfile;
}

async function fetchDeck(deckId: string, ownerId: string): Promise<PublicDeckRecord | null> {
  const supabase = await createClient();
  // RLS already enforces deck.is_public AND owner profile.is_public, but we
  // also pin the owner here so /u/alice/<bob's deck id> 404s instead of
  // silently rendering bob's deck under alice's URL.
  const { data } = await supabase
    .from("saved_decks")
    .select("id, name, deck_list, analysis, updated_at, user_id, like_count, is_public")
    .eq("id", deckId)
    .eq("user_id", ownerId)
    .eq("is_public", true)
    .maybeSingle();
  if (!data) return null;
  return data as PublicDeckRecord;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; deckId: string }>;
}): Promise<Metadata> {
  const { username, deckId } = await params;
  const owner = await fetchOwner(username);
  if (!owner) return { title: "Deck Not Found — TCG Dexter" };
  const deck = await fetchDeck(deckId, owner.id);
  if (!deck) return { title: "Deck Not Found — TCG Dexter" };

  const archetype = deck.analysis.metaMatch?.archetypeName ?? null;
  const title = archetype
    ? `${archetype} by @${owner.username} — TCG Dexter`
    : `${deck.name} by @${owner.username} — TCG Dexter`;
  const description = `${deck.name} — a public deck shared by ${owner.display_name}.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicDeckPage({
  params,
}: {
  params: Promise<{ username: string; deckId: string }>;
}) {
  const { username, deckId } = await params;
  const owner = await fetchOwner(username);
  if (!owner) notFound();

  const deck = await fetchDeck(deckId, owner.id);
  if (!deck) notFound();

  // Viewer state for the like button — anonymous viewers see the count
  // and are bounced to /sign-in on click.
  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  let initialLiked = false;
  if (viewer) {
    const { data: likeRow } = await supabase
      .from("deck_likes")
      .select("user_id")
      .eq("user_id", viewer.id)
      .eq("saved_deck_id", deck.id)
      .maybeSingle();
    initialLiked = Boolean(likeRow);
  }

  const tier = getTierByTitle(owner.trainer_title ?? "Rookie Trainer");
  const creator: DeckCreator = {
    displayName: owner.display_name,
    trainerTitle: tier.title,
    badgeSlug: tier.slug,
    tierColor: tier.color,
  };

  const live = repriceDeck(deck.deck_list);
  const analysis: AnalysisResult = {
    ...deck.analysis,
    deckPrice: live.deckPrice,
    rotation: live.rotation,
  };

  // Canonical URL for share/copy/QR — every share path on this page produces
  // this exact string instead of minting a new /d/[shortId].
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "tcgdexter.com";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const canonicalUrl = `${proto}://${host}/u/${owner.username}/${deck.id}`;

  return (
    <DeckProfileView
      variant="shared"
      deckList={deck.deck_list}
      analysis={analysis}
      profiledAt={deck.updated_at}
      pageTitle={deck.name}
      creator={creator}
      shareUrl={canonicalUrl}
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/u/${owner.username}`}
            className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors underline-offset-2 hover:underline"
          >
            ← @{owner.username}&apos;s decks
          </Link>
          <LikeButton
            deckId={deck.id}
            initialLiked={initialLiked}
            initialCount={deck.like_count ?? 0}
            isAuthenticated={Boolean(viewer)}
          />
          <CopyDeckListButton deckList={deck.deck_list} />
        </div>
      }
    />
  );
}
