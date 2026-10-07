BEGIN;
DO $verify$
DECLARE
  actor uuid; other_actor uuid; root_comment uuid; reply_comment uuid;
  audit_video text := 'comment-ui-audit-' || gen_random_uuid()::text;
  confirmed public.comments; affected integer; total integer;
BEGIN
  SELECT id INTO actor FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO other_actor FROM public.profiles WHERE id<>actor ORDER BY created_at LIMIT 1;
  IF actor IS NULL OR other_actor IS NULL THEN RAISE EXCEPTION 'Two existing profiles are required'; END IF;
  IF has_function_privilege('anon','public.edit_feed_comment(uuid,text)','EXECUTE')
     OR has_function_privilege('anon','public.delete_feed_comment(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Guest mutation access must be denied';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.comments(video_id,user_id,text) VALUES(audit_video,actor,'contenido original') RETURNING id INTO root_comment;
  SELECT * INTO confirmed FROM public.edit_feed_comment(root_comment,'texto actualizado');
  IF confirmed.text<>'texto actualizado' OR confirmed.edited_at IS NULL THEN RAISE EXCEPTION 'Owner edit was not confirmed exactly'; END IF;
  BEGIN
    PERFORM public.edit_feed_comment(root_comment,repeat('😀',301));
    RAISE EXCEPTION 'Oversized edit was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',other_actor::text,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',other_actor,'role','authenticated')::text,true);
  INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(audit_video,other_actor,'respuesta ajena',root_comment) RETURNING id INTO reply_comment;
  BEGIN
    PERFORM public.edit_feed_comment(root_comment,'edicion ajena');
    RAISE EXCEPTION 'Foreign edit was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.delete_feed_comment(root_comment);
    RAISE EXCEPTION 'Foreign deletion was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
  INSERT INTO public.hidden_feed_comment_threads(user_id,root_id,video_id) VALUES(actor,root_comment,audit_video) ON CONFLICT(user_id,root_id) DO NOTHING;
  INSERT INTO public.hidden_feed_comment_threads(user_id,root_id,video_id) VALUES(actor,root_comment,audit_video) ON CONFLICT(user_id,root_id) DO NOTHING;
  IF (SELECT count(*) FROM public.hidden_feed_comment_threads WHERE video_id=audit_video)<>1 THEN RAISE EXCEPTION 'Hiding is not idempotent'; END IF;
  PERFORM public.delete_feed_comment(root_comment);
  IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=root_comment AND deleted_at IS NOT NULL AND text='Comentario eliminado') THEN RAISE EXCEPTION 'Deleted parent placeholder is missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=reply_comment AND deleted_at IS NULL AND text='respuesta ajena') THEN RAISE EXCEPTION 'Foreign reply was not preserved'; END IF;
  SELECT c.total INTO total FROM public.get_feed_comment_counts(ARRAY[audit_video]) c;
  IF total<>1 THEN RAISE EXCEPTION 'Deleted comments are counted as active'; END IF;
  BEGIN
    DELETE FROM public.comments WHERE id=root_comment;
    RAISE EXCEPTION 'Unsafe direct deletion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  DELETE FROM public.hidden_feed_comment_threads WHERE user_id=actor AND video_id=audit_video;
  IF EXISTS(SELECT 1 FROM public.hidden_feed_comment_threads WHERE video_id=audit_video) THEN RAISE EXCEPTION 'Restore failed'; END IF;
  INSERT INTO public.hidden_feed_comment_threads(user_id,root_id,video_id) VALUES(actor,root_comment,audit_video);
  PERFORM set_config('request.jwt.claim.sub',other_actor::text,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',other_actor,'role','authenticated')::text,true);
  IF EXISTS(SELECT 1 FROM public.hidden_feed_comment_threads WHERE video_id=audit_video) THEN RAISE EXCEPTION 'Another account can read private hidden threads'; END IF;
  DELETE FROM public.hidden_feed_comment_threads WHERE user_id=actor AND video_id=audit_video;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Another account can restore someone else preferences'; END IF;
  BEGIN
    INSERT INTO public.hidden_feed_comment_threads(user_id,root_id,video_id) VALUES(actor,root_comment,audit_video);
    RAISE EXCEPTION 'Another account can forge hidden preferences';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(audit_video,other_actor,'otra respuesta',root_comment);
    RAISE EXCEPTION 'A deleted parent accepted a new reply';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  PERFORM public.delete_feed_comment(reply_comment);
  IF EXISTS(SELECT 1 FROM public.comments WHERE video_id=audit_video) THEN RAISE EXCEPTION 'Empty deleted ancestors were not pruned'; END IF;
  SELECT c.total INTO total FROM public.get_feed_comment_counts(ARRAY[audit_video]) c;
  IF total<>0 THEN RAISE EXCEPTION 'Final active count is wrong'; END IF;
END;
$verify$;
ROLLBACK;
SELECT 'owner edit/delete, foreign reply preservation, active counts, personal hiding and RLS passed; transaction rolled back' AS verification;
