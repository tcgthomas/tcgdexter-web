#!/usr/bin/env node
/**
 * One-shot maintenance script: stamps `release_date` onto every card in
 * data/cards-standard.json, sourced from lib/setReleaseDates.ts.
 *
 * Safe to re-run — overwrites existing release_date with the current
 * canonical value. Run with: node scripts/bake-release-dates.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const src = readFileSync(join(repoRoot, "lib/setReleaseDates.ts"), "utf8");
const map = {};
for (const m of src.matchAll(/^\s+([a-z0-9]+):\s*"(\d{4}-\d{2}-\d{2})"/gm)) {
  map[m[1]] = m[2];
}

const dbPath = join(repoRoot, "data/cards-standard.json");
const db = JSON.parse(readFileSync(dbPath, "utf8"));

let updated = 0;
let missing = 0;
const missingSets = new Set();
for (const variants of Object.values(db)) {
  for (const card of variants) {
    const date = map[card.set_id];
    if (!date) {
      missing++;
      missingSets.add(card.set_id);
      continue;
    }
    card.release_date = date;
    updated++;
  }
}

writeFileSync(dbPath, JSON.stringify(db) + "\n");
console.log(`Updated ${updated} card records with release_date.`);
if (missing) {
  console.log(`Missing release date for ${missing} cards across sets:`, [...missingSets]);
}
