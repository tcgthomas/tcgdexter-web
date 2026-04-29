-- Phase 2c-A: Stable @username for profile URLs
--
-- display_name is mutable presentation; URLs need an immutable handle so
-- a rename doesn't break existing links. Adds profiles.username (always
-- stored lowercase, slug-safe, unique). Backfills from display_name.
--
-- Profiles without a display_name keep username = NULL — they're prompted
-- to set one when they try to publish / share. Sharing requires username.
--
-- Apply via Supabase SQL editor or `supabase db execute < file`.

begin;

-- ── profiles.username ──────────────────────────────────────────
alter table public.profiles
  add column if not exists username text;

-- Always lowercase; unique. The check constraint enforces shape at the
-- DB level so the API can't write a malformed value.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_format'
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (
        username is null
        or (
          username = lower(username)
          and length(username) between 3 and 20
          and username ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'
          and username !~ '--'
        )
      );
  end if;
end$$;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

-- ── Backfill ───────────────────────────────────────────────────
-- Derive a slug from display_name; resolve collisions with -2, -3, …
-- Oldest profile (by created_at) wins the unsuffixed slug.
do $$
declare
  rec record;
  base text;
  candidate text;
  suffix int;
  max_base_len int;
begin
  for rec in
    select id, display_name
      from public.profiles
     where username is null
       and display_name is not null
       and trim(display_name) <> ''
     order by created_at
  loop
    -- Lowercase, collapse non-alphanumeric runs to '-', trim edge dashes.
    base := lower(rec.display_name);
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);

    if length(base) < 3 then
      base := 'trainer-' || substr(rec.id::text, 1, 8);
    end if;

    base := substr(base, 1, 20);
    base := trim(both '-' from base);

    -- Reject any pair of consecutive dashes that survived truncation.
    base := regexp_replace(base, '-+', '-', 'g');

    candidate := base;
    suffix := 1;
    while exists (
      select 1 from public.profiles where username = candidate
    ) loop
      suffix := suffix + 1;
      max_base_len := 20 - length('-' || suffix::text);
      candidate := trim(both '-' from substr(base, 1, max_base_len)) || '-' || suffix;
    end loop;

    update public.profiles set username = candidate where id = rec.id;
  end loop;
end$$;

commit;
