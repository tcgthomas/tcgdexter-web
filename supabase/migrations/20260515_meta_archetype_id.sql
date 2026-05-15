-- Track which meta archetype a saved_deck row was cloned from, so the
-- "Save" button on meta-deck preview cards can render an inline saved /
-- unsaved state (mirroring the like-toggle pattern).
--
-- Nullable: only set when the row was created by the meta-deck save
-- flow. Existing user-cloned and originally-authored rows leave it null.

alter table public.saved_decks
  add column if not exists meta_archetype_id text;

create index if not exists saved_decks_meta_archetype_idx
  on public.saved_decks (user_id, meta_archetype_id)
  where meta_archetype_id is not null;
