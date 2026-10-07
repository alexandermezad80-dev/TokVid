BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles ORDER BY created_at LIMIT 1),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE actor uuid:=auth.uid(); video text:='__rollback_feed_like_'||gen_random_uuid()::text;
  reaction record; total integer; real_video uuid; other uuid;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'An existing account is required'; END IF;
  SELECT counts.total INTO total FROM public.get_feed_video_like_counts(ARRAY[video]) counts;
  IF total<>0 THEN RAISE EXCEPTION 'Empty real total failed'; END IF;
  SELECT * INTO reaction FROM public.set_feed_video_like(video,true);
  IF reaction.total<>1 OR NOT reaction.liked THEN RAISE EXCEPTION 'Like confirmation failed'; END IF;
  SELECT * INTO reaction FROM public.set_feed_video_like(video,true);
  IF reaction.total<>1 OR NOT reaction.liked THEN RAISE EXCEPTION 'Idempotent like duplicated count'; END IF;
  SELECT * INTO reaction FROM public.set_feed_video_like(video,false);
  SELECT * INTO reaction FROM public.set_feed_video_like(video,false);
  IF reaction.total<>0 OR reaction.liked THEN RAISE EXCEPTION 'Idempotent unlike failed'; END IF;
  BEGIN
    UPDATE public.feed_video_like_counts SET total=999 WHERE video_id=video;
    RAISE EXCEPTION 'Client changed protected total';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.video_likes(user_id,video_id) VALUES(gen_random_uuid(),video);
    RAISE EXCEPTION 'Ownership spoof accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.get_feed_video_like_counts(ARRAY(SELECT n::text FROM generate_series(1,101) n));
    RAISE EXCEPTION 'Unbounded count lookup accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  INSERT INTO public.videos(user_id,video_url,caption) VALUES(actor,'https://example.invalid/rollback.mp4','Rollback-only audit') RETURNING id INTO real_video;
  PERFORM public.set_feed_video_like(real_video::text,true);
  SELECT likes_count INTO total FROM public.videos WHERE id=real_video;
  IF total<>1 THEN RAISE EXCEPTION 'Stored video counter did not increment'; END IF;
  PERFORM public.set_feed_video_like(real_video::text,false);
  SELECT likes_count INTO total FROM public.videos WHERE id=real_video;
  IF total<>0 THEN RAISE EXCEPTION 'Stored video counter did not reconcile'; END IF;
  DELETE FROM public.videos WHERE id=real_video;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
DECLARE total integer;
BEGIN
  SELECT counts.total INTO total FROM public.get_feed_video_like_counts(ARRAY['__missing_public_video']) counts;
  IF total<>0 THEN RAISE EXCEPTION 'Public total read failed'; END IF;
  BEGIN
    PERFORM public.set_feed_video_like('1',true);
    RAISE EXCEPTION 'Guest wrote a Like';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'feed_video_like_rollback_passed' AS result;
ROLLBACK;
