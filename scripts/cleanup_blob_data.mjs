#!/usr/bin/env node
/**
 * Cleanup leftover Vercel Blob data after Phase 2 Postgres migration.
 *
 * Deletes (or lists, in dry-run mode) three categories of keys:
 *   - alerts/*           → old price alerts (test data, clean slate per product decision)
 *   - submissions/*      → old analysis submissions (PII leak, no longer needed)
 *   - decks/*            → old deck shares (AFTER backfill to Postgres has succeeded)
 *
 * Usage (from tcgdexter-web repo root):
 *   node --env-file=.env.local scripts/cleanup_blob_data.mjs              # dry run
 *   node --env-file=.env.local scripts/cleanup_blob_data.mjs --execute    # actually delete
 *
 * By default, only alerts/ and submissions/ are cleaned up. To also delete
 * the decks/ keys (AFTER running backfill_deck_shares.mjs --execute and
 * verifying the rows are in Postgres), pass --include-decks.
 *
 * Requires env var: BLOB_READ_WRITE_TOKEN
 */

import { list, del } from "@vercel/blob";

const DRY_RUN = !process.argv.includes("--execute");
const INCLUDE_DECKS = process.argv.includes("--include-decks");

const { BLOB_READ_WRITE_TOKEN } = process.env;
if (!BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const prefixes = ["alerts/", "submissions/"];
if (INCLUDE_DECKS) prefixes.push("decks/");

console.log(`Cleanup Vercel Blob data — ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);
console.log(`Prefixes to clean: ${prefixes.join(", ")}`);
console.log();

let grandTotal = 0;
let grandDeleted = 0;

for (const prefix of prefixes) {
  console.log(`--- ${prefix} ---`);
  let cursor = undefined;
  let prefixTotal = 0;
  let prefixDeleted = 0;

  do {
    const { blobs, cursor: nextCursor } = await list({
      prefix,
      cursor,
      limit: 1000,
      token: BLOB_READ_WRITE_TOKEN,
    });
    cursor = nextCursor;

    for (const blob of blobs) {
      prefixTotal++;
      if (DRY_RUN) {
        console.log(`  [dry] Would delete ${blob.pathname}`);
        continue;
      }

      try {
        await del(blob.url, { token: BLOB_READ_WRITE_TOKEN });
        prefixDeleted++;
        if (prefixDeleted % 50 === 0) {
          console.log(`  Deleted ${prefixDeleted} keys so far...`);
        }
      } catch (err) {
        console.error(`  ! Delete failed for ${blob.pathname}:`, err.message);
      }
    }
  } while (cursor);

  console.log(`  Total: ${prefixTotal}, Deleted: ${prefixDeleted}`);
  console.log();
  grandTotal += prefixTotal;
  grandDeleted += prefixDeleted;
}

console.log(`Grand total keys found:    ${grandTotal}`);
console.log(`Grand total keys deleted:  ${grandDeleted}`);

if (DRY_RUN) {
  console.log();
  console.log("This was a DRY RUN. Re-run with --execute to actually delete.");
  if (!INCLUDE_DECKS) {
    console.log("Add --include-decks to also clean up the decks/ prefix (run AFTER backfill).");
  }
}
