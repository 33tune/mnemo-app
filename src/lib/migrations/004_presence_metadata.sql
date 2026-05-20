-- ============================================================
--  Presence metadata — last_active_at, last_profile_update_at
--  Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_at         timestamptz,
  ADD COLUMN IF NOT EXISTS last_profile_update_at timestamptz;

-- Allow authenticated users to update their own presence timestamps.
-- (Assumes the profiles table already has RLS enabled and a basic
--  select-all policy. Only add update policy if not already present.)
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

-- Index for browse queries that filter by recency
CREATE INDEX IF NOT EXISTS profiles_last_active_idx
  ON profiles(last_active_at DESC NULLS LAST);

-- Verify
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_name = 'profiles'
  AND  column_name IN ('last_active_at', 'last_profile_update_at')
ORDER  BY column_name;
