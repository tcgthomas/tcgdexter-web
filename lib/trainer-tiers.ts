/**
 * Trainer tier definitions.
 *
 * Used by:
 *   - POST /api/saved-decks (title-check hook after save)
 *   - /account page (progression display)
 *   - DeckProfileView (creator badge on shared/saved deck views)
 *   - SaveDeckButton (title-upgrade toast)
 *
 * Tiers are ordered from lowest to highest. The `threshold` is the
 * minimum number of saved decks (high-water-mark) required to earn
 * the tier. The `slug` matches the SVG filename in /public/badges/.
 */

export interface TrainerTier {
  /** Minimum saved-deck high-water-mark required. */
  threshold: number;
  /** Display title (stored in profiles.trainer_title). */
  title: string;
  /** Filename slug for the badge SVG in /public/badges/<slug>.svg. */
  slug: string;
  /** Tailwind text-color class for accenting the tier in the UI. */
  color: string;
  /** Tailwind border-color class for the tier. */
  borderColor: string;
  /** Tailwind bg class for light badge backgrounds. */
  bgColor: string;
}

export const TRAINER_TIERS: TrainerTier[] = [
  {
    threshold: 1,
    title: "Rookie Trainer",
    slug: "rookie-trainer",
    color: "text-brown-500",
    borderColor: "border-brown-300",
    bgColor: "bg-tan-100",
  },
  {
    threshold: 5,
    title: "Deck Builder",
    slug: "deck-builder",
    color: "text-green-700",
    borderColor: "border-green-300",
    bgColor: "bg-green-50",
  },
  {
    threshold: 10,
    title: "Strategist",
    slug: "strategist",
    color: "text-blue-700",
    borderColor: "border-blue-300",
    bgColor: "bg-blue-50",
  },
  {
    threshold: 25,
    title: "Deck Architect",
    slug: "deck-architect",
    color: "text-purple-700",
    borderColor: "border-purple-300",
    bgColor: "bg-purple-50",
  },
  {
    threshold: 50,
    title: "Master Trainer",
    slug: "master-trainer",
    color: "text-yellow-700",
    borderColor: "border-yellow-400",
    bgColor: "bg-yellow-50",
  },
  {
    threshold: 100,
    title: "Professor",
    slug: "professor",
    color: "text-yellow-500",
    borderColor: "border-yellow-500",
    bgColor: "bg-brown-900",
  },
];

/**
 * Given a deck count (high-water-mark), return the highest tier the
 * user has earned. Returns null if count is 0 (no tiers earned yet).
 */
export function getTierForCount(count: number): TrainerTier | null {
  if (count <= 0) return null;
  // Walk backwards through the tiers (highest first) to find the first
  // threshold the count meets or exceeds.
  for (let i = TRAINER_TIERS.length - 1; i >= 0; i--) {
    if (count >= TRAINER_TIERS[i].threshold) {
      return TRAINER_TIERS[i];
    }
  }
  return null;
}

/**
 * Given a deck count, return the next tier the user hasn't reached yet.
 * Returns null if the user is at the highest tier.
 */
export function getNextTier(count: number): TrainerTier | null {
  for (const tier of TRAINER_TIERS) {
    if (count < tier.threshold) return tier;
  }
  return null;
}

/**
 * Given a trainer_title string (as stored in the DB), return the
 * matching tier definition. Falls back to the first tier if the
 * title doesn't match any tier (defensive).
 */
export function getTierByTitle(title: string): TrainerTier {
  return (
    TRAINER_TIERS.find((t) => t.title === title) ?? TRAINER_TIERS[0]
  );
}
