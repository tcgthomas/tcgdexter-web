-- Phase 2b: Likes on user-created decks
--
-- Adds deck_likes (user_id, saved_deck_id) with RLS that only permits
-- liking PUBLIC decks, plus a denormalized like_count column on
-- saved_decks kept in sync by trigger. The denormalized count powers
-- the user leaderboard (phase 2c) without per-request aggregation.
--
-- Meta archetypes are intentionally NOT covered here — they have no
-- owner row to credit, so meta likes (if ever introduced) would live
-- in a separate slug-keyed table.
--
-- Apply via Supabase SQL editor or `supabase db execute < file`.

begin;

-- ── saved_decks.like_count ─────────────────────────────────────
alter table public.saved_decks
  add column if not exists like_count integer not null default 0;

-- ── deck_likes ─────────────────────────────────────────────────
create table if not exists public.deck_likes (
  user_id        uuid not null references auth.users(id) on delete cascade,
  saved_deck_id  uuid not null references public.saved_decks(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, saved_deck_id)
);

-- For "decks I've liked" lookups + leaderboard joins.
create index if not exists deck_likes_saved_deck_idx
  on public.deck_likes (saved_deck_id);

-- RLS
alter table public.deck_likes enable row level security;

-- Authenticated users can read all likes (needed for "is this liked
-- by me?" checks and for any future "who liked this" surface).
drop policy if exists "deck_likes_authenticated_read" on public.deck_likes;
create policy "deck_likes_authenticated_read"
  on public.deck_likes
  for select
  to authenticated
  using (true);

-- A user can only insert their own like, and only for a deck whose
-- owner has opted public AND the deck itself is public. Mirrors the
-- cascading visibility rule from phase 1 — you can't like what you
-- can't see.
drop policy if exists "deck_likes_owner_insert" on public.deck_likes;
create policy "deck_likes_owner_insert"
  on public.deck_likes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.saved_decks d
      join public.profiles p on p.id = d.user_id
      where d.id = saved_deck_id
        and d.is_public = true
        and p.is_public = true
    )
  );

-- A user can only remove their own like.
drop policy if exists "deck_likes_owner_delete" on public.deck_likes;
create policy "deck_likes_owner_delete"
  on public.deck_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ── like_count denormalization trigger ─────────────────────────
create or replace function public.deck_likes_count_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.saved_decks
       set like_count = like_count + 1
     where id = new.saved_deck_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.saved_decks
       set like_count = greatest(like_count - 1, 0)
     where id = old.saved_deck_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists deck_likes_count_sync_ins on public.deck_likes;
create trigger deck_likes_count_sync_ins
  after insert on public.deck_likes
  for each row execute function public.deck_likes_count_sync();

drop trigger if exists deck_likes_count_sync_del on public.deck_likes;
create trigger deck_likes_count_sync_del
  after delete on public.deck_likes
  for each row execute function public.deck_likes_count_sync();

-- One-time backfill in case any deck_likes rows existed before this
-- migration ran (no-op on a clean install).
update public.saved_decks d
   set like_count = sub.cnt
  from (
    select saved_deck_id, count(*)::int as cnt
      from public.deck_likes
     group by saved_deck_id
  ) sub
 where d.id = sub.saved_deck_id
   and d.like_count <> sub.cnt;

commit;
