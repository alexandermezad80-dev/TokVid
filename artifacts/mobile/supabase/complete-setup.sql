-- Complete Supabase setup for TokVid
-- Run this once in Supabase → SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  avatar_url text,
  bio text DEFAULT 'Living life one frame at a time 🎬✨',
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  push_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text DEFAULT '',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read videos" ON public.videos;
DROP POLICY IF EXISTS "auth insert videos" ON public.videos;
DROP POLICY IF EXISTS "own delete videos" ON public.videos;

CREATE POLICY "anyone read videos"
  ON public.videos FOR SELECT USING (true);

CREATE POLICY "auth insert videos"
  ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own delete videos"
  ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- 3) Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  text text NOT NULL CHECK (char_length(text) <= 500),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read comments" ON public.comments;
DROP POLICY IF EXISTS "auth insert comments" ON public.comments;
DROP POLICY IF EXISTS "own delete comments" ON public.comments;

CREATE POLICY "anyone read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "auth insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- 4) Conversations and messages
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (user1_id <> user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participant read convos" ON public.conversations;
DROP POLICY IF EXISTS "participant insert convos" ON public.conversations;
DROP POLICY IF EXISTS "participant update convos" ON public.conversations;

CREATE POLICY "participant read convos" ON public.conversations FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "participant insert convos" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "participant update convos" ON public.conversations FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) <= 1000),
  read_by_other boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participant read messages" ON public.messages;
DROP POLICY IF EXISTS "participant insert messages" ON public.messages;
DROP POLICY IF EXISTS "participant update messages" ON public.messages;

CREATE POLICY "participant read messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);

CREATE POLICY "participant insert messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);

CREATE POLICY "participant update messages" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
);

-- 5) Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own follows" ON public.follows;
DROP POLICY IF EXISTS "insert own follows" ON public.follows;
DROP POLICY IF EXISTS "delete own follows" ON public.follows;

CREATE POLICY "read own follows" ON public.follows FOR SELECT USING (auth.uid() = follower_id);
CREATE POLICY "insert own follows" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "delete own follows" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- SECURITY DEFINER is required for the trigger to update profile counters.
-- It is trigger-only: direct RPC execution is revoked from client roles.
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
      SET following_count = following_count + 1
      WHERE id = NEW.follower_id;
    UPDATE public.profiles
      SET followers_count = followers_count + 1
      WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
      SET following_count = GREATEST(0, following_count - 1)
      WHERE id = OLD.follower_id;
    UPDATE public.profiles
      SET followers_count = GREATEST(0, followers_count - 1)
      WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM authenticated;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows(following_id);

-- 6) Hashtags and video_hashtags
CREATE TABLE IF NOT EXISTS public.hashtags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tag text UNIQUE NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read hashtags" ON public.hashtags;
DROP POLICY IF EXISTS "auth insert hashtags" ON public.hashtags;
DROP POLICY IF EXISTS "auth update hashtags" ON public.hashtags;

CREATE POLICY "anyone read hashtags" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "auth insert hashtags" ON public.hashtags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update hashtags" ON public.hashtags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.video_hashtags (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (video_id, hashtag_id)
);

ALTER TABLE public.video_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read video_hashtags" ON public.video_hashtags;
DROP POLICY IF EXISTS "owner insert video_hashtags" ON public.video_hashtags;

CREATE POLICY "anyone read video_hashtags" ON public.video_hashtags FOR SELECT USING (true);
CREATE POLICY "owner insert video_hashtags" ON public.video_hashtags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS video_hashtags_hashtag_id_idx ON public.video_hashtags(hashtag_id);

CREATE OR REPLACE FUNCTION public.upsert_hashtag(p_tag text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.hashtags (tag)
  VALUES (p_tag)
  ON CONFLICT (tag) DO UPDATE SET usage_count = public.hashtags.usage_count + 1
  RETURNING id;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_hashtag(text) TO authenticated;

-- 7) Saved videos
CREATE TABLE IF NOT EXISTS public.saved_videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own read saved_videos" ON public.saved_videos;
DROP POLICY IF EXISTS "own insert saved_videos" ON public.saved_videos;
DROP POLICY IF EXISTS "own delete saved_videos" ON public.saved_videos;

CREATE POLICY "own read saved_videos" ON public.saved_videos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert saved_videos" ON public.saved_videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete saved_videos" ON public.saved_videos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_videos_user_id_idx ON public.saved_videos(user_id);

-- 8) Video likes
CREATE TABLE IF NOT EXISTS public.video_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own select video_likes" ON public.video_likes;
DROP POLICY IF EXISTS "own insert video_likes" ON public.video_likes;
DROP POLICY IF EXISTS "own delete video_likes" ON public.video_likes;

CREATE POLICY "own select video_likes" ON public.video_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert video_likes" ON public.video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete video_likes" ON public.video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS video_likes_user_id_idx ON public.video_likes(user_id);
CREATE INDEX IF NOT EXISTS video_likes_video_id_idx ON public.video_likes(video_id);

CREATE OR REPLACE FUNCTION public.update_video_like_counts()
RETURNS trigger AS $$
DECLARE
  video_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET likes_count = likes_count + 1
    WHERE id::text = NEW.video_id;

    SELECT user_id INTO video_owner FROM public.videos WHERE id::text = NEW.video_id;
    IF video_owner IS NOT NULL THEN
      UPDATE public.profiles SET likes_count = likes_count + 1 WHERE id = video_owner;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id::text = OLD.video_id;

    SELECT user_id INTO video_owner FROM public.videos WHERE id::text = OLD.video_id;
    IF video_owner IS NOT NULL THEN
      UPDATE public.profiles SET likes_count = GREATEST(0, likes_count - 1) WHERE id = video_owner;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_like_change ON public.video_likes;
CREATE TRIGGER on_video_like_change
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_video_like_counts();

-- 9) Notifications table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token text;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_avatar text,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system')),
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Actor can insert notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Actor can insert notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications(user_id, created_at DESC);

-- 10) Storage bucket note
-- In Supabase Dashboard → Storage → New bucket → Name: videos → Public: ON
