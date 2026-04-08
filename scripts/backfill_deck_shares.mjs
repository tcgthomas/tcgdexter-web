#!/usr/bin/env node
/**
 * Backfill deck_shares from Vercel Blob to Supabase Postgres.
 *
 * Reads every JSON key under the `decks/` prefix on Vercel Blob, parses
 * it, and inserts a corresponding row into public.deck_shares. Anonymous
 * (user_id = null) because we don't know who created them.
 *
 * Idempotent: uses upsert on conflict(id) do nothing, so re-running is safe.
 *
 * Usage (from tcgdexter-web repo root):
 *   node scripts/backfill_deck_shares.mjs              # dry run (default)
 *   node scripts/backfill_deck_shares.mjs --execute    # actually insert
 *
 * Requires env vars:
 *   BLOB_READ_WRITE_TOKEN
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with:
 *   vercel env pull .env.local  (to get Blob and Supabase tokens)
 *   node --env-file=.env.local scripts/backfill_deck_shares.mjs
 */

import { list } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = !process.argv.includes("--execute");

const {
  BLOB_READ_WRITE_TOKEN,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`Backfill deck_shares — ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);
console.log("Listing blobs under prefix 'decks/'...");

let cursor = undefined;
let total = 0;
let inserted = 0;
let failed = 0;
let skipped = 0;

do {
  const { blobs, cursor: nextCursor } = await list({
    prefix: "decks/",
    cursor,
    limit: 1000,
    token: BLOB_READ_WRITE_TOKEN,
  });
  cursor = nextCursor;

  for (const blob of blobs) {
    total++;
    // Key format: decks/<shortId>.json
    const match = blob.pathname.match(/^decks\/([^/]+)\.json$/);
    if (!match) {
      console.warn(`  ? Skipping unexpected key: ${blob.pathname}`);
      skipped++;
      continue;
    }
    const shortId = match[1];

    try {
      const res = await fetch(blob.url);
      if (!res.ok) {
        console.warn(`  ! Fetch failed for ${blob.pathname}: ${res.status}`);
        failed++;
        continue;
      }
      const payload = await res.json();

      if (!payload.deckList || !payload.analysis) {
        console.warn(`  ! Malformed payload for ${shortId}`);
        failed++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  + [dry] Would insert deck_shares id=${shortId}`);
        inserted++;
        continue;
      }

      const { error } = await supabase.from("deck_shares").upsert(
        {
          id: shortId,
          user_id: null,
          deck_list: payload.deckList,
          analysis: payload.analysis,
          created_at: payload.profiledAt ?? new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      if (error) {
        console.error(`  ! Insert failed for ${shortId}:`, error.message);
        failed++;
      } else {
        console.log(`  + Inserted ${shortId}`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ! Error processing ${blob.pathname}:`, err.message);
      failed++;
    }
  }
} while (cursor);

console.log();
console.log(`Total keys:  ${total}`);
console.log(`Inserted:    ${inserted}`);
console.log(`Failed:      ${failed}`);
console.log(`Skipped:     ${skipped}`);

if (DRY_RUN) {
  console.log();
  console.log("This was a DRY RUN. Re-run with --execute to actually insert.");
}
