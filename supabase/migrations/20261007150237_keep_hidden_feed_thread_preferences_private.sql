-- Preferences are reloaded on opening the panel and returning to the app.
-- Avoid broadcasting DELETE primary keys containing private user/thread pairs.
ALTER PUBLICATION supabase_realtime DROP TABLE public.hidden_feed_comment_threads;

