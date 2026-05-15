-- Revert: shared_matches participant cross-visibility (recursive RLS)
--
-- The previous migration (20260505_shared_matches_participant_visibility)
-- added two SELECT policies that referenced shared_matches. shared_matches
-- already has shared_matches_admin_read which subqueries profiles, so any
-- read of profiles triggered the new participant policy → which read
-- shared_matches → which evaluated the admin policy → which read profiles
-- again, ad infinitum. Postgres aborted with
--   42P17: infinite recursion detected in policy for relation "profiles"
-- and the entire app fell back to empty profile data on every page.
--
-- This rolls those two policies out. The participant-visibility need will
-- be solved with a SECURITY DEFINER view/function in a follow-up so the
-- subquery runs outside RLS and can't recurse.

begin;

drop policy if exists "profiles_match_participant_read" on public.profiles;
drop policy if exists "saved_decks_match_participant_read" on public.saved_decks;

commit;
