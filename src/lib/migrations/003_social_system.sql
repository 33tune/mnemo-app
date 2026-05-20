-- ============================================================
--  Social system — follows & favorites
--  Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

-- ── Drop existing (reverse dep order) ────────────────────────
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS follows   CASCADE;

-- ── follows ──────────────────────────────────────────────────
CREATE TABLE follows (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL    DEFAULT now(),
  UNIQUE  (follower_id, following_id),
  CHECK   (follower_id <> following_id)
);

CREATE INDEX follows_follower_idx  ON follows(follower_id);
CREATE INDEX follows_following_idx ON follows(following_id);

-- ── favorites ─────────────────────────────────────────────────
CREATE TABLE favorites (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL    DEFAULT now(),
  UNIQUE  (user_id, target_user_id),
  CHECK   (user_id <> target_user_id)
);

CREATE INDEX favorites_user_idx   ON favorites(user_id);
CREATE INDEX favorites_target_idx ON favorites(target_user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE follows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- follows: public read for counts; write scoped to self
CREATE POLICY "follows_select"
  ON follows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "follows_insert"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid() AND follower_id <> following_id);

CREATE POLICY "follows_delete"
  ON follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- favorites: private (own rows only)
CREATE POLICY "favorites_select"
  ON favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "favorites_insert"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND user_id <> target_user_id);

CREATE POLICY "favorites_delete"
  ON favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── Verify ───────────────────────────────────────────────────
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN ('follows', 'favorites')
ORDER  BY table_name;
