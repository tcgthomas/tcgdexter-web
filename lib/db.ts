import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL not set");
  return neon(url);
}

export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS deck_submissions (
      id          SERIAL PRIMARY KEY,
      player_id   TEXT NOT NULL,        -- SHA-256 hash of IP, never raw IP
      archetype   TEXT,                 -- detected archetype name or null
      style       TEXT,                 -- Aggro/Control/Combo/Stall/Midrange or null
      tier        INTEGER,              -- 1/2/3 or null
      energy_types TEXT[],              -- array of energy type names
      deck_size   INTEGER,
      pokemon_count INTEGER,
      trainer_count INTEGER,
      energy_count INTEGER,
      country     TEXT,                 -- from x-vercel-ip-country header
      region      TEXT,                 -- from x-vercel-ip-country-region header
      raw_deck    TEXT NOT NULL,        -- full deck list text
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_deck_submissions_player ON deck_submissions(player_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deck_submissions_archetype ON deck_submissions(archetype)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deck_submissions_created ON deck_submissions(created_at)`;
}
