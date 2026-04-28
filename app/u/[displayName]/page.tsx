import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTierByTitle } from "@/lib/trainer-tiers";
import SectionHeader from "@/app/components/ui/SectionHeader";

interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  trainer_title: string | null;
  created_at: string;
}

interface PublicDeck {
  id: string;
  name: string;
  analysis: {
    deckPrice?: number;
    metaMatch?: { archetypeName?: string | null };
    rotation?: { ready?: boolean };
  } | null;
  updated_at: string;
}

async function fetchProfile(name: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  // ilike with no wildcards = case-insensitive equality. display_name is
  // unique case-insensitively (enforced in /api/profile).
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, trainer_title, created_at, is_public")
    .ilike("display_name", name)
    .eq("is_public", true)
    .maybeSingle();
  if (!data) return null;
  return data as PublicProfile;
}

async function fetchPublicDecks(userId: string): Promise<PublicDeck[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_decks")
    .select("id, name, analysis, updated_at")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  return (data ?? []) as PublicDeck[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ displayName: string }>;
}): Promise<Metadata> {
  const { displayName } = await params;
  const decoded = decodeURIComponent(displayName);
  const profile = await fetchProfile(decoded);
  if (!profile) return { title: "Trainer Not Found — TCG Dexter" };
  const title = `${profile.display_name} — TCG Dexter`;
  const description = profile.bio?.trim() || `Public deck collection by ${profile.display_name}.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ displayName: string }>;
}) {
  const { displayName } = await params;
  const decoded = decodeURIComponent(displayName);
  const profile = await fetchProfile(decoded);
  if (!profile) notFound();

  const decks = await fetchPublicDecks(profile.id);
  const tier = getTierByTitle(profile.trainer_title ?? "Rookie Trainer");
  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="mb-6">
        <SectionHeader eyebrow="Trainer" title={profile.display_name} />
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-black/5 flex-shrink-0 flex items-center justify-center text-text-muted text-xl font-semibold">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/badges/${tier.slug}.svg`}
                alt={tier.title}
                className="w-5 h-5 flex-shrink-0"
              />
              <p className={`text-sm font-bold ${tier.color}`}>{tier.title}</p>
            </div>
            <p className="text-xs text-text-muted mt-0.5">Joined {joinedDate}</p>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-text-secondary leading-relaxed mt-4 whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Public decks */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-3 px-1">
          Public Decks
          {decks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-text-muted">({decks.length})</span>
          )}
        </h2>

        {decks.length === 0 ? (
          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-8 text-center">
            <p className="text-sm text-text-secondary">
              {profile.display_name} hasn&apos;t shared any decks yet.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm overflow-hidden">
            {decks.map((deck, i) => {
              const archetype = deck.analysis?.metaMatch?.archetypeName ?? null;
              const price = deck.analysis?.deckPrice ?? null;
              const standard = deck.analysis?.rotation?.ready ?? null;
              return (
                <Link
                  key={deck.id}
                  href={`/u/${encodeURIComponent(profile.display_name)}/${deck.id}`}
                  className={`block px-5 py-3.5 flex items-center gap-3 hover:bg-black/[0.02] transition-colors ${
                    i === decks.length - 1 ? "" : "border-b border-bg"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-base truncate">
                      {deck.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                      {archetype && <span className="truncate">{archetype}</span>}
                      {archetype && (price !== null || standard !== null) && <span>·</span>}
                      {price !== null && price > 0 && (
                        <span className="tabular-nums">${price.toFixed(2)}</span>
                      )}
                      {standard === true && (
                        <>
                          {price !== null && price > 0 && <span>·</span>}
                          <span>Standard</span>
                        </>
                      )}
                    </div>
                  </div>
                  <svg
                    className="flex-shrink-0 w-4 h-4 text-text-muted"
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
      </div>
    </main>
  );
}
