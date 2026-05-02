-- Lock deck sharing behind authentication.
--
-- Anonymous deck sharing is being removed. Going forward, every row in
-- deck_shares must be owned by a profile. Existing anonymous rows are
-- dropped (per product decision — bookmarked /d/<shortId> URLs for those
-- 22 rows will start 404'ing).
--
-- Also tightens the FK to ON DELETE CASCADE so deleting a profile (e.g. via
-- account deletion) cleans up its shares without orphaning rows.

DELETE FROM public.deck_shares WHERE user_id IS NULL;

ALTER TABLE public.deck_shares
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.deck_shares
  DROP CONSTRAINT deck_shares_user_id_fkey,
  ADD CONSTRAINT deck_shares_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMENT ON TABLE public.deck_shares IS
  'Public deck profile snapshots backing /d/<shortId>. Auth required to create.';
