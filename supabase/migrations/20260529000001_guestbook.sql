-- Guestbook messages: one table per space, messages keyed by profile owner
CREATE TABLE IF NOT EXISTS guestbook_messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name    TEXT        NOT NULL DEFAULT 'anon',
  author_avatar  TEXT        NOT NULL DEFAULT '',
  message        TEXT        NOT NULL,
  anonymous      BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guestbook_message_length CHECK (char_length(message) BETWEEN 1 AND 280)
);

CREATE INDEX IF NOT EXISTS guestbook_messages_profile_idx
  ON guestbook_messages (profile_id, created_at DESC);

ALTER TABLE guestbook_messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read guestbook messages
CREATE POLICY "guestbook_select" ON guestbook_messages
  FOR SELECT USING (true);

-- Authenticated or anonymous can insert (anon via service role not needed here)
CREATE POLICY "guestbook_insert" ON guestbook_messages
  FOR INSERT WITH CHECK (true);

-- Author can delete their own messages; space owner can delete any
CREATE POLICY "guestbook_delete" ON guestbook_messages
  FOR DELETE USING (
    auth.uid() = author_id OR auth.uid() = profile_id
  );
