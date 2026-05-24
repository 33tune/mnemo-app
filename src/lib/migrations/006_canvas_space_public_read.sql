-- ============================================================
--  Allow authenticated users to read published (space) canvases.
--  Required for SOCIAL → PEOPLE to extract profile avatars
--  from published canvas data.
--  Safe to run multiple times.
-- ============================================================

DO $$
BEGIN
  -- Only create policy if RLS is enabled on canvases AND policy doesn't exist
  IF (SELECT rowsecurity FROM pg_tables WHERE tablename = 'canvases' AND schemaname = 'public')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE tablename = 'canvases' AND policyname = 'canvases_space_public_select'
     )
  THEN
    CREATE POLICY "canvases_space_public_select"
      ON canvases FOR SELECT
      TO authenticated
      USING (type = 'space');
  END IF;
END $$;
