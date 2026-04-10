/**
 * Display name validation rules.
 *
 * Used by:
 *   - PATCH /api/profile (server-side validation before DB write)
 *   - EditDisplayName component (client-side preview, optional)
 *
 * Rules:
 *   - 2–30 characters after trimming
 *   - Alphanumeric, spaces, hyphens, underscores only
 *   - Not on the blocklist (case-insensitive)
 *   - Uniqueness enforced at the DB level via a unique index on lower(display_name)
 */

/**
 * Names that cannot be used as display names. Checked case-insensitively.
 *
 * Categories:
 *   - Platform reserved: names that could impersonate staff or system
 *   - Brand protection: names that could impersonate the IP holders
 *   - Generic system terms: names that look like system placeholders
 *   - Common inappropriate terms: a sensible (not exhaustive) blocklist
 */
const BLOCKED_NAMES: string[] = [
  // ── Platform reserved ──────────────────────────────────
  "admin",
  "administrator",
  "moderator",
  "mod",
  "tcgdexter",
  "tcg dexter",
  "dexter",
  "support",
  "help",
  "staff",
  "team",
  "official",
  "system",
  "bot",
  "automod",

  // ── Brand / IP protection ──────────────────────────────
  "pokemon",
  "pokémon",
  "nintendo",
  "gamefreak",
  "game freak",
  "creatures",
  "creatures inc",
  "wizards",
  "wizards of the coast",
  "wotc",
  "the pokemon company",
  "tpc",
  "pikachu",
  "charizard",

  // ── Generic system terms ───────────────────────────────
  "null",
  "undefined",
  "anonymous",
  "unknown",
  "deleted",
  "removed",
  "banned",
  "suspended",
  "test",
  "testuser",
  "root",
  "superuser",
  "guest",
  "default",
  "user",
  "player",
  "trainer",

  // ── Common inappropriate (sensible baseline) ───────────
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "damn",
  "dick",
  "fuck",
  "shit",
  "cunt",
  "piss",
  "cock",
  "pussy",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "rape",
  "nazi",
  "hitler",
  "porn",
  "sex",
  "xxx",
  "kill",
  "murder",
  "suicide",
];

/** Pre-computed lowercase set for O(1) lookup. */
const BLOCKED_SET = new Set(BLOCKED_NAMES.map((n) => n.toLowerCase()));

/** Characters allowed in display names. */
const VALID_CHARS = /^[a-zA-Z0-9 _-]+$/;

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Validate a candidate display name against format rules and the blocklist.
 * Does NOT check uniqueness (that requires a DB query).
 */
export function validateDisplayName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "Display name must be at least 2 characters." };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Display name must be 30 characters or fewer." };
  }

  if (!VALID_CHARS.test(trimmed)) {
    return {
      valid: false,
      error: "Display name can only contain letters, numbers, spaces, hyphens, and underscores.",
    };
  }

  // Check the full name AND each word individually against the blocklist.
  // This catches "admin" as a standalone name and also "admin123" patterns
  // by checking if the name starts with a blocked term.
  const lower = trimmed.toLowerCase();

  if (BLOCKED_SET.has(lower)) {
    return { valid: false, error: "That display name is not available." };
  }

  // Check if the name contains a blocked word as a distinct segment
  for (let i = 0; i < BLOCKED_NAMES.length; i++) {
    const blocked = BLOCKED_NAMES[i].toLowerCase();
    if (lower === blocked || lower.startsWith(blocked + " ") || lower.endsWith(" " + blocked)) {
      return { valid: false, error: "That display name is not available." };
    }
  }

  return { valid: true, error: null };
}

/**
 * Sanitize a raw email prefix into a valid display name candidate.
 * Used by the signup trigger fallback when the email prefix itself
 * is blocked or contains invalid characters.
 */
export function sanitizeEmailPrefix(prefix: string): string {
  // Strip invalid chars, trim, truncate to 30
  let cleaned = prefix.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 30);
  if (cleaned.length < 2) cleaned = "Trainer";
  return cleaned;
}
