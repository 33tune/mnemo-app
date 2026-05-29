-- Add device_type to existing profile_views table
ALTER TABLE profile_views ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'unknown';

-- Link clicks tracking table
CREATE TABLE IF NOT EXISTS link_clicks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_label       TEXT        NOT NULL DEFAULT '',
  link_url         TEXT        NOT NULL DEFAULT '',
  device_type      TEXT        NOT NULL DEFAULT 'unknown',
  clicked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS link_clicks_profile_idx
  ON link_clicks (profile_user_id, clicked_at DESC);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public profile visitors tracking their own clicks)
CREATE POLICY "link_clicks_insert"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Only the profile owner can read their own analytics
CREATE POLICY "link_clicks_owner_read"
  ON link_clicks FOR SELECT
  USING (auth.uid() = profile_user_id);
