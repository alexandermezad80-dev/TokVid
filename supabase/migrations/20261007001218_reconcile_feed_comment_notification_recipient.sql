-- Keep video-owner and reply-author notifications accurate, without duplicates.
CREATE OR REPLACE FUNCTION public.create_feed_comment(p_video_id text, p_text text, p_parent_id uuid, p_request_id text)
RETURNS SETOF public.comments LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_comment public.comments;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR char_length(p_request_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Falta el identificador de envío' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_comment FROM public.comments WHERE user_id=v_actor AND client_request_id=p_request_id;
  IF NOT FOUND THEN
    INSERT INTO public.comments (video_id,user_id,text,parent_id,client_request_id)
    VALUES (p_video_id,v_actor,p_text,p_parent_id,p_request_id)
    ON CONFLICT (user_id,client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
    RETURNING * INTO v_comment;
    IF FOUND THEN
      -- Preserve existing comment notifications; reply recipients are real parent authors.
      INSERT INTO public.notifications (user_id,actor_id,actor_name,actor_avatar,type,message,data)
      SELECT recipient,v_actor,v_comment.username,v_comment.avatar_url,'comment',
        CASE WHEN receives_reply THEN 'Respondió a tu comentario' ELSE 'Comentó tu video' END,
        jsonb_build_object('video_id',p_video_id,'comment_id',v_comment.id,'parent_id',p_parent_id)
      FROM (
        SELECT recipient,bool_or(is_parent_author) AS receives_reply FROM (
          SELECT user_id AS recipient,false AS is_parent_author FROM public.videos WHERE id::text=p_video_id
          UNION ALL
          SELECT user_id,true FROM public.comments WHERE id=p_parent_id
        ) targets GROUP BY recipient
      ) recipients WHERE recipient<>v_actor;
    ELSE
      SELECT * INTO v_comment FROM public.comments WHERE user_id=v_actor AND client_request_id=p_request_id;
    END IF;
  END IF;
  IF v_comment.id IS NULL OR v_comment.video_id IS DISTINCT FROM p_video_id
     OR v_comment.parent_id IS DISTINCT FROM p_parent_id
     OR v_comment.text IS DISTINCT FROM btrim(p_text,E' \t\r\n') THEN
    RAISE EXCEPTION 'Este envío ya pertenece a otro comentario' USING ERRCODE='22023';
  END IF;
  RETURN NEXT v_comment;
END;
$$;
REVOKE ALL ON FUNCTION public.create_feed_comment(text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_feed_comment(text,text,uuid,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
