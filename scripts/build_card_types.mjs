#!/usr/bin/env node
/**
 * build_card_types.mjs — derive a slim `data/card-types.json` from the full
 * `data/cards-standard.json`.
 *
 * Why: the full card DB is ~12MB (attacks, abilities, prices, etc.) and
 * blows past Vercel's 1MB edge function bundle limit. The Overview matrix
 * and OG image only need types + subtypes, so a slim lookup keeps the OG
 * route on edge runtime with fast cold starts.
 *
 * Run after `export_cards_standard.py` updates `cards-standard.json`:
 *
 *   npm run build:card-types
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const inPath = resolve(root, "data/cards-standard.json");
const outPath = resolve(root, "data/card-types.json");

const full = JSON.parse(readFileSync(inPath, "utf8"));

const slim = {};
for (const [name, entries] of Object.entries(full)) {
  // First non-empty types/subtypes across printings wins. cardTypes.ts
  // mirrors this (it always reads entries[0]); we just dedupe.
  let types;
  let subtypes;
  for (const e of entries) {
    if (!types && e.types?.length) types = e.types;
    if (!subtypes && e.subtypes?.length) subtypes = e.subtypes;
    if (types && subtypes) break;
  }
  const slot = {};
  if (types) slot.types = types;
  if (subtypes) slot.subtypes = subtypes;
  if (types || subtypes) slim[name] = slot;
}

writeFileSync(outPath, JSON.stringify(slim));

const inSize = readFileSync(inPath).length;
const outSize = readFileSync(outPath).length;
console.log(
  `card-types.json: ${Object.keys(slim).length} cards, ` +
    `${(outSize / 1024).toFixed(1)}KB ` +
    `(slim from ${(inSize / 1024 / 1024).toFixed(1)}MB)`,
);
