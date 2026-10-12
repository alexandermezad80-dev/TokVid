BEGIN;
DO $verify$
DECLARE
  author_id uuid; owner_id uuid; own_video uuid; foreign_video uuid;
  root_comment uuid; reply_comment uuid; child_comment uuid; sibling_comment uuid;
  standalone uuid; moderated uuid; liked_child integer; total integer; record_comment public.comments;
BEGIN
  SELECT id INTO author_id FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO owner_id FROM public.profiles WHERE id<>author_id ORDER BY created_at LIMIT 1;
  IF author_id IS NULL OR owner_id IS NULL THEN RAISE EXCEPTION 'Two existing profiles are required'; END IF;
  INSERT INTO public.videos(user_id,video_url,caption) VALUES(author_id,'https://example.invalid/rollback-only.mp4','rollback audit') RETURNING id INTO own_video;
  INSERT INTO public.videos(user_id,video_url,caption) VALUES(owner_id,'https://example.invalid/rollback-only.mp4','rollback audit') RETURNING id INTO foreign_video;
  IF has_function_privilege('anon','public.remove_feed_comment(uuid)','EXECUTE')
    OR has_table_privilege('authenticated','public.comments','DELETE') THEN RAISE EXCEPTION 'Unsafe deletion privileges'; END IF;
  PERFORM set_config('request.jwt.claim.sub',author_id::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.comments(video_id,user_id,text) VALUES(own_video::text,author_id,'raiz propia') RETURNING id INTO root_comment;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  BEGIN
    PERFORM public.remove_feed_comment(root_comment);
    RAISE EXCEPTION 'A stranger removed a foreign comment';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.edit_feed_comment(root_comment,'edicion ajena');
    RAISE EXCEPTION 'A stranger edited foreign text';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(own_video::text,owner_id,'respuesta propia',root_comment) RETURNING id INTO reply_comment;
  SELECT * INTO record_comment FROM public.edit_feed_comment(reply_comment,'respuesta editada');
  IF record_comment.text<>'respuesta editada' THEN RAISE EXCEPTION 'Reply editing failed'; END IF;
  INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(own_video::text,owner_id,'hermana',root_comment) RETURNING id INTO sibling_comment;
  INSERT INTO public.hidden_feed_comment_threads(user_id,video_id,root_id) VALUES(owner_id,own_video::text,root_comment);
  PERFORM set_config('request.jwt.claim.sub',author_id::text,true);
  INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(own_video::text,author_id,'hija que debe sobrevivir',reply_comment) RETURNING id INTO child_comment;
  PERFORM public.set_feed_comment_like(reply_comment,true);
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM public.set_feed_comment_like(child_comment,true);
  PERFORM public.remove_feed_comment(reply_comment);
  IF EXISTS(SELECT 1 FROM public.comments WHERE id=reply_comment) THEN RAISE EXCEPTION 'Reply still exists'; END IF;
  SELECT * INTO record_comment FROM public.comments WHERE id=child_comment;
  IF record_comment.id IS NULL OR record_comment.parent_id<>root_comment OR record_comment.root_id<>root_comment OR record_comment.text<>'hija que debe sobrevivir' OR record_comment.likes_count<>1 THEN RAISE EXCEPTION 'Child was lost or modified incorrectly'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=sibling_comment) THEN RAISE EXCEPTION 'Sibling was lost'; END IF;
  IF EXISTS(SELECT 1 FROM public.comment_likes WHERE comment_id=reply_comment) THEN RAISE EXCEPTION 'Removed reply likes survived'; END IF;
  IF (SELECT reply_count FROM public.comments WHERE id=root_comment)<>2 OR (SELECT comments_count FROM public.videos WHERE id=own_video)<>3 THEN RAISE EXCEPTION 'Individual deletion counts are wrong'; END IF;
  PERFORM set_config('request.jwt.claim.sub',author_id::text,true);
  PERFORM public.remove_feed_comment(root_comment);
  IF EXISTS(SELECT 1 FROM public.comments WHERE video_id=own_video::text) OR (SELECT comments_count FROM public.videos WHERE id=own_video)<>0 THEN RAISE EXCEPTION 'Root cascade/count failed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  IF EXISTS(SELECT 1 FROM public.hidden_feed_comment_threads WHERE root_id=root_comment) THEN RAISE EXCEPTION 'Hidden preferences survived root deletion'; END IF;
  BEGIN
    INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(own_video::text,owner_id,'late reply',root_comment);
    RAISE EXCEPTION 'Deleted root accepted a reply';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',author_id::text,true);
  INSERT INTO public.comments(video_id,user_id,text) VALUES(foreign_video::text,author_id,'propio en perfil ajeno') RETURNING id INTO standalone;
  SELECT * INTO record_comment FROM public.edit_feed_comment(standalone,'editado en perfil ajeno');
  IF record_comment.text<>'editado en perfil ajeno' THEN RAISE EXCEPTION 'Foreign-profile author edit failed'; END IF;
  PERFORM public.remove_feed_comment(standalone);
  IF EXISTS(SELECT 1 FROM public.comments WHERE id=standalone) THEN RAISE EXCEPTION 'Standalone author deletion failed'; END IF;
  INSERT INTO public.comments(video_id,user_id,text) VALUES(foreign_video::text,author_id,'autor elimina hilo en perfil ajeno') RETURNING id INTO standalone;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(foreign_video::text,owner_id,'respuesta del dueño',standalone);
  PERFORM set_config('request.jwt.claim.sub',author_id::text,true);
  PERFORM public.remove_feed_comment(standalone);
  IF EXISTS(SELECT 1 FROM public.comments WHERE video_id=foreign_video::text) THEN RAISE EXCEPTION 'Author cascade in foreign profile failed'; END IF;
  INSERT INTO public.comments(video_id,user_id,text) VALUES(foreign_video::text,author_id,'moderacion pendiente') RETURNING id INTO moderated;
  INSERT INTO public.comments(video_id,user_id,text,parent_id) VALUES(foreign_video::text,author_id,'respuesta',moderated);
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  BEGIN
    PERFORM public.edit_feed_comment(moderated,'texto alterado por dueño');
    RAISE EXCEPTION 'Moderator edited foreign text';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF (SELECT user_id FROM public.get_feed_comment_owner(foreign_video::text))<>owner_id THEN RAISE EXCEPTION 'Publication owner check failed'; END IF;
  PERFORM public.remove_feed_comment(moderated);
  PERFORM public.remove_feed_comment(moderated);
  IF EXISTS(SELECT 1 FROM public.comments WHERE video_id=foreign_video::text) OR (SELECT comments_count FROM public.videos WHERE id=foreign_video)<>0 THEN RAISE EXCEPTION 'Moderation cascade/count failed'; END IF;
END;
$verify$;
ROLLBACK;
SELECT 'Author edit/delete anywhere, root cascade, individual reply preservation, moderation, counters and privileges passed; transaction rolled back' AS verification;
