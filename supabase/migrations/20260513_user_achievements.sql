-- User achievements
--
-- Single table keyed by (user_id, achievement_key) so each achievement
-- can only be earned once per user. v1 ships with one key —
-- 'certified_trainer', awarded for a perfect score on the Trainer Quiz
-- at /learn/quiz. Future achievements drop new rows here without a
-- schema change.
--
-- Reads are open (profiles are public surfaces); writes are gated to
-- the row's own user. The /api/learn/quiz route does the actual insert
-- under the user's session, so RLS is the durable enforcement.
--
-- Apply via Supabase SQL editor or `supabase db execute < file`.

begin;

create table if not exists public.user_achievements (
  user_id         uuid        not null references auth.users(id) on delete cascade,
  achievement_key text        not null,
  earned_at       timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create index if not exists user_achievements_key_earned_idx
  on public.user_achievements (achievement_key, earned_at desc);

-- RLS
alter table public.user_achievements enable row level security;

-- Authenticated users can read all achievement rows — powers the
-- "achievements" card on any profile page when the viewer is signed in.
drop policy if exists "user_achievements_authenticated_read" on public.user_achievements;
create policy "user_achievements_authenticated_read"
  on public.user_achievements
  for select
  to authenticated
  using (true);

-- Anonymous viewers can also read — profile pages render unauthenticated
-- too, and we want the badge to show up there.
drop policy if exists "user_achievements_anon_read" on public.user_achievements;
create policy "user_achievements_anon_read"
  on public.user_achievements
  for select
  to anon
  using (true);

-- A user can only insert their own achievement rows. The API route is
-- the only documented writer.
drop policy if exists "user_achievements_owner_insert" on public.user_achievements;
create policy "user_achievements_owner_insert"
  on public.user_achievements
  for insert
  to authenticated
  with check (user_id = auth.uid());

commit;
