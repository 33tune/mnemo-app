-- ============================================================
--  Chat system — run this in Supabase SQL Editor
--  Safe to run multiple times (drops first, then recreates)
-- ============================================================

-- ─── Drop existing (reverse dependency order) ────────────────

DROP TABLE IF EXISTS chat_windows    CASCADE;
DROP TABLE IF EXISTS messages        CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chats           CASCADE;

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE chats (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL    DEFAULT now()
);

CREATE TABLE chat_participants (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id   uuid        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, user_id)
);

CREATE TABLE messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    uuid        NOT NULL REFERENCES chats(id)        ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  content    text        NOT NULL,
  image_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_windows (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id    uuid             NOT NULL REFERENCES chats(id)      ON DELETE CASCADE,
  x          double precision NOT NULL DEFAULT 120,
  y          double precision NOT NULL DEFAULT 120,
  w          double precision NOT NULL DEFAULT 340,
  h          double precision NOT NULL DEFAULT 440,
  z_index    integer          NOT NULL DEFAULT 1,
  minimized  boolean          NOT NULL DEFAULT false,
  updated_at timestamptz      NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id)
);

-- ─── Indexes ─────────────────────────────────────────────────

CREATE INDEX messages_chat_created_idx    ON messages(chat_id, created_at);
CREATE INDEX chat_participants_user_idx   ON chat_participants(user_id);
CREATE INDEX chat_windows_user_idx        ON chat_windows(user_id);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_windows       ENABLE ROW LEVEL SECURITY;

-- chats: only visible to participants
CREATE POLICY "chats_select"
  ON chats FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- chat_participants: visible to members of the same chat; insert as yourself
CREATE POLICY "chat_participants_select"
  ON chat_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_participants_insert"
  ON chat_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- messages: readable by participants; insert only as yourself in a chat you belong to
CREATE POLICY "messages_select"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

-- chat_windows: full CRUD scoped to own rows only
CREATE POLICY "chat_windows_select"
  ON chat_windows FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_windows_insert"
  ON chat_windows FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_windows_update"
  ON chat_windows FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_windows_delete"
  ON chat_windows FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── Verify ──────────────────────────────────────────────────

SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN ('chats','chat_participants','messages','chat_windows')
ORDER  BY table_name;
