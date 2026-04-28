-- Phase 1: Public profiles + per-deck visibility (foundations)
--
-- Adds is_public / avatar_url / bio to profiles, is_public + cloned_from_id
-- to saved_decks, the avatars storage bucket, and RLS policies enforcing the
-- cascading rule: a saved deck is publicly readable only when both the deck
-- and its owner's profile are flagged public.
--
-- Apply via Supabase SQL editor or `supabase db execute < file`.

begin;

-- ── profiles ───────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_public  boolean not null default false,
  add column if not exists avatar_url text,
  add column if not exists bio        text;

-- Public read of profile rows that have opted in. Existing owner-read
-- policies are left untouched; this just widens reads for is_public rows.
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles
  for select
  to anon, authenticated
  using (is_public = true);

-- ── saved_decks ────────────────────────────────────────────────────────
alter table public.saved_decks
  add column if not exists is_public      boolean not null default false,
  add column if not exists cloned_from_id uuid references public.saved_decks(id) on delete set null;

create index if not exists saved_decks_public_idx
  on public.saved_decks (user_id)
  where is_public = true;

-- Cascading public read: deck must be public AND owner profile must be public.
-- Owner-only policies (existing) still cover the private path.
drop policy if exists "saved_decks_public_read" on public.saved_decks;
create policy "saved_decks_public_read"
  on public.saved_decks
  for select
  to anon, authenticated
  using (
    is_public = true
    and exists (
      select 1 from public.profiles p
      where p.id = saved_decks.user_id
        and p.is_public = true
    )
  );

-- ── avatars storage bucket ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read of any avatar object (bucket is public).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- Authenticated users may write only into their own folder: avatars/{uid}/*
drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
