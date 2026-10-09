BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles ORDER BY created_at LIMIT 1),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  actor uuid:=auth.uid(); request_id text:=gen_random_uuid()::text;
  video text:='__rollback_comment_audit_'||gen_random_uuid()::text;
  root public.comments; repeated public.comments; reply public.comments; nested public.comments; liked public.comments;
  number integer; profile_name text; real_video uuid; real_comment public.comments; notification_total bigint;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Existing test account is required'; END IF;
  SELECT username INTO profile_name FROM public.profiles WHERE id=actor;
  SELECT count(*) INTO notification_total FROM public.notifications WHERE user_id=actor;
  SELECT * INTO root FROM public.create_feed_comment(video,' Comentario real de auditoría ',NULL,request_id);
  IF root.id IS NULL OR root.user_id<>actor OR root.username<>profile_name OR root.text<>'Comentario real de auditoría' THEN RAISE EXCEPTION 'Canonical identity/persisted content failed'; END IF;
  SELECT * INTO repeated FROM public.create_feed_comment(video,' Comentario real de auditoría ',NULL,request_id);
  IF repeated.id<>root.id THEN RAISE EXCEPTION 'Request retry duplicated comment'; END IF;
  BEGIN
    PERFORM public.create_feed_comment(video,'Different content',NULL,request_id);
    RAISE EXCEPTION 'Request collision accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  SELECT * INTO reply FROM public.create_feed_comment(video,repeat('😀',300),root.id,gen_random_uuid()::text);
  SELECT * INTO nested FROM public.create_feed_comment(video,'Respuesta a respuesta',reply.id,gen_random_uuid()::text);
  IF reply.root_id<>root.id OR nested.root_id<>root.id OR nested.parent_id<>reply.id OR nested.reply_to_username<>reply.username THEN RAISE EXCEPTION 'Thread linkage failed'; END IF;
  SELECT reply_count INTO number FROM public.comments WHERE id=root.id;
  IF number<>2 THEN RAISE EXCEPTION 'Real reply count failed: %',number; END IF;
  SELECT total INTO number FROM public.get_feed_comment_counts(ARRAY[video]);
  IF number<>3 THEN RAISE EXCEPTION 'Total count failed: %',number; END IF;
  BEGIN
    PERFORM public.create_feed_comment(video,repeat('😀',301),NULL,gen_random_uuid()::text);
    RAISE EXCEPTION 'Overlong text accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.create_feed_comment(video,E' \n\t ',NULL,gen_random_uuid()::text);
    RAISE EXCEPTION 'Blank text accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.create_feed_comment(video||'_other','Cross-video reply',root.id,gen_random_uuid()::text);
    RAISE EXCEPTION 'Cross-video reply accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  SELECT * INTO liked FROM public.set_feed_comment_like(root.id,true);
  IF liked.likes_count<>1 THEN RAISE EXCEPTION 'Like persistence failed'; END IF;
  SELECT * INTO liked FROM public.set_feed_comment_like(root.id,true);
  IF liked.likes_count<>1 THEN RAISE EXCEPTION 'Repeated like duplicated counter'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.comment_likes WHERE user_id=actor AND comment_id=root.id) THEN RAISE EXCEPTION 'Own like state absent'; END IF;
  BEGIN
    UPDATE public.comments SET likes_count=999 WHERE id=root.id;
    RAISE EXCEPTION 'Protected counter write accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.comment_likes(comment_id,user_id) VALUES(root.id,gen_random_uuid());
    RAISE EXCEPTION 'Other-user like accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.comments(video_id,user_id,username,text) VALUES(video,gen_random_uuid(),'spoof','spoof');
    RAISE EXCEPTION 'Other-user comment accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.comments(video_id,user_id,username,text) VALUES(video,actor,'spoofed-name','Legacy insert') RETURNING * INTO repeated;
  IF repeated.username<>profile_name THEN RAISE EXCEPTION 'Client spoofed identity'; END IF;
  SELECT * INTO liked FROM public.set_feed_comment_like(root.id,false);
  SELECT * INTO liked FROM public.set_feed_comment_like(root.id,false);
  IF liked.likes_count<>0 THEN RAISE EXCEPTION 'Unlike was not idempotent'; END IF;
  PERFORM public.set_feed_comment_like(reply.id,true);
  DELETE FROM public.comments WHERE id=root.id;
  IF EXISTS(SELECT 1 FROM public.comments WHERE id IN(root.id,reply.id,nested.id)) OR EXISTS(SELECT 1 FROM public.comment_likes WHERE comment_id=reply.id) THEN RAISE EXCEPTION 'Thread/like cascade failed'; END IF;
  SELECT total INTO number FROM public.get_feed_comment_counts(ARRAY[video]);
  IF number<>1 THEN RAISE EXCEPTION 'Deletion count reconciliation failed'; END IF;
  DELETE FROM public.comments WHERE id=repeated.id;
  SELECT total INTO number FROM public.get_feed_comment_counts(ARRAY[video]);
  IF number<>0 THEN RAISE EXCEPTION 'Empty count failed'; END IF;
  INSERT INTO public.videos(user_id,video_url,caption) VALUES(actor,'https://example.invalid/rollback-audit.mp4','Rollback-only audit') RETURNING id INTO real_video;
  SELECT * INTO real_comment FROM public.create_feed_comment(real_video::text,'Real video counter audit',NULL,gen_random_uuid()::text);
  SELECT comments_count INTO number FROM public.videos WHERE id=real_video;
  IF number<>1 THEN RAISE EXCEPTION 'Stored real video counter did not increment'; END IF;
  DELETE FROM public.comments WHERE id=real_comment.id;
  SELECT comments_count INTO number FROM public.videos WHERE id=real_video;
  IF number<>0 THEN RAISE EXCEPTION 'Stored real video counter did not reconcile'; END IF;
  IF (SELECT count(*) FROM public.notifications WHERE user_id=actor)<>notification_total THEN RAISE EXCEPTION 'Self-notification was generated'; END IF;
  DELETE FROM public.videos WHERE id=real_video;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.create_feed_comment('1','Guest write',NULL,gen_random_uuid()::text);
    RAISE EXCEPTION 'Guest comment accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_feed_comment_like(gen_random_uuid(),true);
    RAISE EXCEPTION 'Guest like accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'rollback_audit_passed' AS result;
ROLLBACK;
