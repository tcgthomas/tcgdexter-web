-- User-chosen cover card for a saved deck's preview cell. When null,
-- the post-card UI falls back to the auto-pick from `primaryCardImageUrl`
-- (highest-stage Pokémon, then most copies).
--
-- Stored as a full pokemontcg.io image URL so render paths stay simple;
-- the PATCH endpoint validates the host before writing.

alter table public.saved_decks
  add column if not exists cover_image_url text;
