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
CREATE POLICY "participant read convos" ON conversations FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "participant insert convos" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = user1_id AND user1_id <> user2_id
);
CREATE POLICY "participant update convos" ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Membership must never be rewritten by a participant. Participants may only
-- update conversation metadata such as last_message and last_message_at.
CREATE OR REPLACE FUNCTION protect_conversation_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user1_id IS DISTINCT FROM OLD.user1_id
     OR NEW.user2_id IS DISTINCT FROM OLD.user2_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'conversation membership is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_conversation_membership ON conversations;
CREATE TRIGGER protect_conversation_membership
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION protect_conversation_membership();

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
CREATE POLICY "participant update messages" ON messages FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
    AND auth.uid() = sender_id
  );

-- A participant may mark a message as read, but may not transfer ownership,
-- move it to another conversation, rewrite its text, or change its timestamp.
CREATE OR REPLACE FUNCTION protect_message_authoritative_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.text IS DISTINCT FROM OLD.text
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'message authoritative fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_message_authoritative_fields ON messages;
CREATE TRIGGER protect_message_authoritative_fields
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION protect_message_authoritative_fields();

-- Conversation preview metadata is derived from messages, not trusted from clients.
-- Only advance the preview when the inserted message is newer than the current preview.
CREATE OR REPLACE FUNCTION update_conversation_metadata_from_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message = NEW.text,
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id
    AND (last_message_at IS NULL OR NEW.created_at >= last_message_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_conversation_metadata_from_message ON messages;
CREATE TRIGGER update_conversation_metadata_from_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_metadata_from_message();

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

-- 5. HASHTAGS + VIDEO_HASHTAGS (hashtags & mentions feature)
CREATE TABLE IF NOT EXISTS hashtags (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tag          text UNIQUE NOT NULL,
  usage_count  integer NOT NULL DEFAULT 1,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read hashtags" ON hashtags FOR SELECT USING (true);
-- Direct client writes are intentionally blocked. The SECURITY DEFINER RPC
-- below is the only write path and validates that the caller is authenticated.
CREATE POLICY "authenticated hashtag insert" ON hashtags FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "authenticated hashtag update" ON hashtags FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS video_hashtags (
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  hashtag_id  uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (video_id, hashtag_id)
);
ALTER TABLE video_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read video_hashtags" ON video_hashtags FOR SELECT USING (true);
CREATE POLICY "owner insert video_hashtags" ON video_hashtags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM videos v WHERE v.id = video_id AND v.user_id = auth.uid())
  );
CREATE INDEX IF NOT EXISTS video_hashtags_hashtag_id_idx ON video_hashtags(hashtag_id);

-- Atomic create-or-increment for a hashtag; returns the hashtag id.
-- SECURITY DEFINER so the increment (UPDATE) path runs regardless of caller RLS,
-- while still being callable only by logged-in users (GRANT below).
CREATE OR REPLACE FUNCTION upsert_hashtag(p_tag text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO hashtags (tag)
  VALUES (p_tag)
  ON CONFLICT (tag) DO UPDATE SET usage_count = hashtags.usage_count + 1
  RETURNING id;
$$;
GRANT EXECUTE ON FUNCTION upsert_hashtag(text) TO authenticated;

-- 6. SAVED_VIDEOS ("Guardar video" / favorites feature)
CREATE TABLE IF NOT EXISTS saved_videos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own read saved_videos"   ON saved_videos;
DROP POLICY IF EXISTS "own insert saved_videos" ON saved_videos;
DROP POLICY IF EXISTS "own delete saved_videos" ON saved_videos;
CREATE POLICY "own read saved_videos"   ON saved_videos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert saved_videos" ON saved_videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete saved_videos" ON saved_videos FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS saved_videos_user_id_idx ON saved_videos(user_id);

-- 7. VIDEO LIKES (like / unlike videos from Supabase)
CREATE TABLE IF NOT EXISTS video_likes (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select video_likes" ON video_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert video_likes" ON video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete video_likes" ON video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS video_likes_user_id_idx ON video_likes(user_id);
CREATE INDEX IF NOT EXISTS video_likes_video_id_idx ON video_likes(video_id);

CREATE OR REPLACE FUNCTION update_video_like_counts()
RETURNS TRIGGER AS $$
DECLARE
  video_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET likes_count = likes_count + 1 WHERE id::text = NEW.video_id;
    SELECT user_id INTO video_owner FROM videos WHERE id::text = NEW.video_id;
    IF video_owner IS NOT NULL THEN
      UPDATE profiles SET likes_count = likes_count + 1 WHERE id = video_owner;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id::text = OLD.video_id;
    SELECT user_id INTO video_owner FROM videos WHERE id::text = OLD.video_id;
    IF video_owner IS NOT NULL THEN
      UPDATE profiles SET likes_count = GREATEST(0, likes_count - 1) WHERE id = video_owner;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_video_like_change
  AFTER INSERT OR DELETE ON video_likes
  FOR EACH ROW EXECUTE FUNCTION update_video_like_counts();

-- AFTER running this SQL, also do in Supabase Dashboard:
-- Storage → New bucket → Name: "videos" → Public: ON
