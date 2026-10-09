-- Per-account visibility only; hiding a thread never deletes public comments.
CREATE TABLE public.hidden_feed_comment_threads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  root_id uuid NOT NULL,
  video_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, root_id),
  FOREIGN KEY (root_id, video_id) REFERENCES public.comments(id, video_id) ON DELETE CASCADE
);
CREATE INDEX hidden_feed_threads_root_video_idx ON public.hidden_feed_comment_threads(root_id, video_id);
CREATE INDEX hidden_feed_threads_user_video_idx ON public.hidden_feed_comment_threads(user_id, video_id);
ALTER TABLE public.hidden_feed_comment_threads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hidden_feed_comment_threads FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.hidden_feed_comment_threads TO authenticated;
GRANT INSERT (user_id, root_id, video_id) ON public.hidden_feed_comment_threads TO authenticated;
CREATE POLICY hidden_feed_threads_read_own ON public.hidden_feed_comment_threads
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY hidden_feed_threads_insert_own ON public.hidden_feed_comment_threads
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY hidden_feed_threads_delete_own ON public.hidden_feed_comment_threads
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.hidden_feed_comment_threads;
NOTIFY pgrst, 'reload schema';

