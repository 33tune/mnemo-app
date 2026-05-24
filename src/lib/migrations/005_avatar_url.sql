-- ============================================================
--  Avatar URL — ensures profiles.avatar_url column exists
--  and that authenticated users can update their own row.
--  Safe to run multiple times.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Ensure update policy exists (migration 004 may not have run on all envs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY "profiles_update_own"
      ON profiles FOR UPDATE TO authenticated
      USING    (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
