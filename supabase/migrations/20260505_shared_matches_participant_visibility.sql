-- Shared Matches: participant cross-visibility
--
-- The match detail page (/matches/[id]) needs to render each player's
-- display_name + username and each player's deck name + archetype, so
-- both sides can see who they're playing and pick a winner. The original
-- profiles_public_read and saved_decks_public_read policies only expose
-- rows flagged is_public, which means two trainers with private profiles
-- can't see each other's info — which silently hides the result-submission
-- buttons (the action area gates on match.opponent being truthy).
--
-- Fix: allow a SELECT on a profile or deck row when it is referenced as
-- a participant or participant's deck in a shared_match where the caller
-- is the *other* participant. Narrow: only reveals to actual opponents.

begin;

drop policy if exists "profiles_match_participant_read" on public.profiles;
create policy "profiles_match_participant_read"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.shared_matches m
      where (m.creator_user_id = profiles.id and m.opponent_user_id = auth.uid())
         or (m.opponent_user_id = profiles.id and m.creator_user_id = auth.uid())
    )
  );

drop policy if exists "saved_decks_match_participant_read" on public.saved_decks;
create policy "saved_decks_match_participant_read"
  on public.saved_decks for select
  to authenticated
  using (
    exists (
      select 1 from public.shared_matches m
      where (m.creator_decklist_id = saved_decks.id and m.opponent_user_id = auth.uid())
         or (m.opponent_decklist_id = saved_decks.id and m.creator_user_id = auth.uid())
    )
  );

commit;
