-- ────────────────────────────────────────────────────────────
-- Run this in Supabase → SQL Editor
-- ────────────────────────────────────────────────────────────

-- 1. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id    text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text NOT NULL,
  avatar_url  text,
  text        text NOT NULL CHECK (char_length(text) <= 500),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read comments"  ON comments FOR SELECT USING (true);
CREATE POLICY "auth insert comments"  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete comments"   ON comments FOR DELETE USING (auth.uid() = user_id);

-- 2. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message     text,
  last_message_at  timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (user1_id <> user2_id)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participant read convos"   ON conversations FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "participant insert convos" ON conversations FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "participant update convos" ON conversations FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text             text NOT NULL CHECK (char_length(text) <= 1000),
  read_by_other    boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participant read messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);
CREATE POLICY "participant insert messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);
CREATE POLICY "participant update messages" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);

-- 4. VIDEOS (for uploads from Create screen)
CREATE TABLE IF NOT EXISTS videos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url             text NOT NULL,
  caption         text DEFAULT '',
  likes_count     integer DEFAULT 0,
  comments_count  integer DEFAULT 0,
  shares_count    integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read videos"  ON videos FOR SELECT USING (true);
CREATE POLICY "auth insert videos"  ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete videos"   ON videos FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- AFTER running this SQL, also do in Supabase Dashboard:
-- Storage → New bucket → Name: "videos" → Public: ON
-- ────────────────────────────────────────────────────────────
