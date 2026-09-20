-- Reconcile onboarding/profile contracts, avatar storage and video likes.
-- Applied to the TokVid Supabase project as migration 20260920195153.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT 'Living life one frame at a time 🎬✨',
  ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.profiles
SET
  bio = COALESCE(bio, 'Living life one frame at a time 🎬✨'),
  followers_count = COALESCE(followers_count, 0),
  following_count = COALESCE(following_count, 0),
  likes_count = COALESCE(likes_count, 0),
  updated_at = COALESCE(updated_at, created_at, now());

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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE video_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id::text = NEW.video_id;
    SELECT user_id INTO video_owner FROM public.videos WHERE id::text = NEW.video_id;
    IF video_owner IS NOT NULL THEN
      UPDATE public.profiles SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = video_owner;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id::text = OLD.video_id;
    SELECT user_id INTO video_owner FROM public.videos WHERE id::text = OLD.video_id;
    IF video_owner IS NOT NULL THEN
      UPDATE public.profiles SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = video_owner;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_video_like_change ON public.video_likes;
CREATE TRIGGER on_video_like_change AFTER INSERT OR DELETE ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.update_video_like_counts();

DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
