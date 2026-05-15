-- Verified Shared Matches
--
-- Two players co-record a single match. User A creates a match with a
-- short code; User B redeems the code, picks their own deck, joins. Each
-- player submits a result (win/loss/draw). Matching results finalize;
-- conflicts can be re-submitted or escalated to a judge with photo
-- evidence. Finalized rows are publicly readable so they can be surfaced
-- on each user's deck and trainer profile alongside the existing
-- (private, owner-only) manual matches.
--
-- Apply via Supabase SQL editor or `supabase db execute < file`.

begin;

-- ── profiles: admin flag for judge ruling access ──────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── shared_matches ────────────────────────────────────────────────────
create table if not exists public.shared_matches (
  id                    uuid primary key default gen_random_uuid(),
  code                  text,
  creator_user_id       uuid not null references public.profiles(id) on delete cascade,
  creator_decklist_id   uuid not null references public.saved_decks(id) on delete cascade,
  creator_result        text check (creator_result in ('win','loss','draw')),
  opponent_user_id      uuid references public.profiles(id) on delete cascade,
  opponent_decklist_id  uuid references public.saved_decks(id) on delete cascade,
  opponent_result       text check (opponent_result in ('win','loss','draw')),
  status                text not null default 'pending'
                          check (status in ('pending','finalized','conflict','under_review')),
  final_winner_user_id  uuid references public.profiles(id) on delete set null,
  final_outcome         text check (final_outcome in ('creator_win','opponent_win','draw')),
  judge_ruled           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  finalized_at          timestamptz,
  expires_at            timestamptz not null default (now() + interval '24 hours'),
  constraint shared_matches_distinct_users
    check (opponent_user_id is null or opponent_user_id <> creator_user_id)
);

create unique index if not exists shared_matches_code_key
  on public.shared_matches (code) where code is not null;

create index if not exists shared_matches_creator_user_idx
  on public.shared_matches (creator_user_id);
create index if not exists shared_matches_opponent_user_idx
  on public.shared_matches (opponent_user_id);
create index if not exists shared_matches_creator_deck_idx
  on public.shared_matches (creator_decklist_id);
create index if not exists shared_matches_opponent_deck_idx
  on public.shared_matches (opponent_decklist_id);
create index if not exists shared_matches_open_idx
  on public.shared_matches (status)
  where status in ('pending','conflict','under_review');

-- updated_at trigger
create or replace function public.shared_matches_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shared_matches_updated_at on public.shared_matches;
create trigger shared_matches_updated_at
  before update on public.shared_matches
  for each row execute function public.shared_matches_set_updated_at();

alter table public.shared_matches enable row level security;

-- Participants always see their own matches (any status).
drop policy if exists "shared_matches_participant_read" on public.shared_matches;
create policy "shared_matches_participant_read"
  on public.shared_matches for select
  to authenticated
  using (
    auth.uid() = creator_user_id
    or auth.uid() = opponent_user_id
  );

-- Anyone can read finalized matches (the public surface). The deck-side
-- visibility cascade is enforced at the application layer when joining
-- against saved_decks.
drop policy if exists "shared_matches_public_read_finalized" on public.shared_matches;
create policy "shared_matches_public_read_finalized"
  on public.shared_matches for select
  to anon, authenticated
  using (status = 'finalized');

-- Admins can read everything (for dispute review).
drop policy if exists "shared_matches_admin_read" on public.shared_matches;
create policy "shared_matches_admin_read"
  on public.shared_matches for select
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true)
  );

-- Creator can insert their own match. Code/expiry are app-set.
drop policy if exists "shared_matches_creator_insert" on public.shared_matches;
create policy "shared_matches_creator_insert"
  on public.shared_matches for insert
  to authenticated
  with check (
    creator_user_id = auth.uid()
    and exists (
      select 1 from public.saved_decks d
      where d.id = creator_decklist_id and d.user_id = auth.uid()
    )
  );

-- Participants can update result/status fields. The /result and /join
-- handlers do the heavy lifting; this just gates raw row access.
drop policy if exists "shared_matches_participant_update" on public.shared_matches;
create policy "shared_matches_participant_update"
  on public.shared_matches for update
  to authenticated
  using (
    auth.uid() = creator_user_id
    or auth.uid() = opponent_user_id
  )
  with check (
    auth.uid() = creator_user_id
    or auth.uid() = opponent_user_id
  );

-- Admin update for ruling.
drop policy if exists "shared_matches_admin_update" on public.shared_matches;
create policy "shared_matches_admin_update"
  on public.shared_matches for update
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true)
  );

-- Atomic claim of the opponent slot. Prevents the race where two users
-- redeem the same code simultaneously. SECURITY DEFINER so the function
-- can write past RLS once it has validated identity itself.
create or replace function public.claim_shared_match(
  p_code text,
  p_opponent_decklist_id uuid
)
returns table (match_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_row  public.shared_matches%rowtype;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  -- Ensure the deck belongs to the caller.
  if not exists (
    select 1 from public.saved_decks d
    where d.id = p_opponent_decklist_id and d.user_id = v_uid
  ) then
    raise exception 'deck not owned' using errcode = '42501';
  end if;

  update public.shared_matches m
     set opponent_user_id     = v_uid,
         opponent_decklist_id = p_opponent_decklist_id,
         code                 = null
   where m.code = p_code
     and m.opponent_user_id is null
     and m.creator_user_id <> v_uid
     and m.expires_at > now()
   returning * into v_row;

  if not found then
    raise exception 'code invalid, used, expired, or self-join' using errcode = '22023';
  end if;

  return query select v_row.id;
end;
$$;

grant execute on function public.claim_shared_match(text, uuid) to authenticated;

-- Public lookup-by-code for join confirmation. Non-participants can't read
-- a pending row directly under RLS, so we expose a narrow SECURITY DEFINER
-- function that returns just the fields needed for the join screen.
create or replace function public.lookup_shared_match_by_code(p_code text)
returns table (
  match_id                uuid,
  creator_user_id         uuid,
  creator_display_name    text,
  creator_username        text,
  creator_decklist_id     uuid,
  creator_deck_name       text,
  creator_deck_archetype  text,
  expires_at              timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.creator_user_id,
    p.display_name,
    p.username,
    m.creator_decklist_id,
    d.name,
    (d.analysis -> 'metaMatch' ->> 'archetypeName'),
    m.expires_at
  from public.shared_matches m
  join public.profiles p on p.id = m.creator_user_id
  join public.saved_decks d on d.id = m.creator_decklist_id
  where m.code = p_code
    and m.opponent_user_id is null
    and m.expires_at > now();
$$;

grant execute on function public.lookup_shared_match_by_code(text) to authenticated;

-- ── match_evidence ────────────────────────────────────────────────────
create table if not exists public.match_evidence (
  id                    uuid primary key default gen_random_uuid(),
  match_id              uuid not null references public.shared_matches(id) on delete cascade,
  submitted_by_user_id  uuid not null references public.profiles(id) on delete cascade,
  image_path            text not null,
  note                  text,
  created_at            timestamptz not null default now()
);

create index if not exists match_evidence_match_idx
  on public.match_evidence (match_id);

alter table public.match_evidence enable row level security;

-- Participants and admins can read.
drop policy if exists "match_evidence_read" on public.match_evidence;
create policy "match_evidence_read"
  on public.match_evidence for select
  to authenticated
  using (
    submitted_by_user_id = auth.uid()
    or exists (
      select 1 from public.shared_matches m
      where m.id = match_evidence.match_id
        and (m.creator_user_id = auth.uid() or m.opponent_user_id = auth.uid())
    )
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin = true)
  );

-- Only participants can insert evidence for their own match.
drop policy if exists "match_evidence_insert" on public.match_evidence;
create policy "match_evidence_insert"
  on public.match_evidence for insert
  to authenticated
  with check (
    submitted_by_user_id = auth.uid()
    and exists (
      select 1 from public.shared_matches m
      where m.id = match_evidence.match_id
        and (m.creator_user_id = auth.uid() or m.opponent_user_id = auth.uid())
    )
  );

-- ── match_judge_rulings ───────────────────────────────────────────────
create table if not exists public.match_judge_rulings (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references public.shared_matches(id) on delete cascade,
  ruled_by_user_id    uuid not null references public.profiles(id) on delete set null,
  winner_user_id      uuid references public.profiles(id) on delete set null,
  outcome             text not null check (outcome in ('creator_win','opponent_win','draw')),
  note                text,
  created_at          timestamptz not null default now()
);

create index if not exists match_judge_rulings_match_idx
  on public.match_judge_rulings (match_id);

alter table public.match_judge_rulings enable row level security;

-- Participants and admins can read rulings on their matches.
drop policy if exists "match_judge_rulings_read" on public.match_judge_rulings;
create policy "match_judge_rulings_read"
  on public.match_judge_rulings for select
  to authenticated
  using (
    exists (
      select 1 from public.shared_matches m
      where m.id = match_judge_rulings.match_id
        and (m.creator_user_id = auth.uid() or m.opponent_user_id = auth.uid())
    )
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin = true)
  );

-- Only admins can insert rulings.
drop policy if exists "match_judge_rulings_insert" on public.match_judge_rulings;
create policy "match_judge_rulings_insert"
  on public.match_judge_rulings for insert
  to authenticated
  with check (
    ruled_by_user_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.is_admin = true)
  );

-- ── match-evidence storage bucket (private) ───────────────────────────
insert into storage.buckets (id, name, public)
values ('match-evidence', 'match-evidence', false)
on conflict (id) do nothing;

-- Read: participants of the match this object belongs to, or any admin.
-- Path convention: {match_id}/{user_id}/{filename}
drop policy if exists "match_evidence_storage_read" on storage.objects;
create policy "match_evidence_storage_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'match-evidence'
    and (
      exists (
        select 1 from public.shared_matches m
        where m.id::text = (storage.foldername(name))[1]
          and (m.creator_user_id = auth.uid() or m.opponent_user_id = auth.uid())
      )
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_admin = true)
    )
  );

-- Insert: participants writing under their own user folder for a match
-- they're part of.
drop policy if exists "match_evidence_storage_insert" on storage.objects;
create policy "match_evidence_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'match-evidence'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.shared_matches m
      where m.id::text = (storage.foldername(name))[1]
        and (m.creator_user_id = auth.uid() or m.opponent_user_id = auth.uid())
    )
  );

commit;
