-- Account-visible comment counts and opt-in photo comments. Existing text RPCs remain compatible.
ALTER TABLE public.comments ADD COLUMN image_path text;
GRANT INSERT (image_path) ON public.comments TO authenticated;
GRANT SELECT (image_path) ON public.comments TO anon, authenticated;
-- Anonymous reads see no rows: the existing SELECT policy is restricted to authenticated/own uid.
GRANT SELECT ON public.dismissed_feed_comments TO anon;
CREATE INDEX comments_image_path_idx ON public.comments(image_path) WHERE image_path IS NOT NULL;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('comment-images','comment-images',false,8388608,ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY comment_images_insert_own ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='comment-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY comment_images_read_visible ON storage.objects FOR SELECT TO anon,authenticated
USING(bucket_id='comment-images' AND ((storage.foldername(name))[1]=(SELECT auth.uid())::text OR EXISTS(
 SELECT 1 FROM public.comments c WHERE c.image_path=objects.name AND c.deleted_at IS NULL)));
CREATE POLICY comment_images_delete_unused_own ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='comment-images' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text AND NOT EXISTS(
 SELECT 1 FROM public.comments c WHERE c.image_path=objects.name));
CREATE OR REPLACE FUNCTION tokvid_internal.validate_feed_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_profile record; v_parent public.comments; v_root uuid;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Inicia sesión para publicar con tu cuenta' USING ERRCODE='42501';
  END IF;
  IF NEW.video_id IS NULL OR char_length(btrim(NEW.video_id)) NOT BETWEEN 1 AND 256 THEN
    RAISE EXCEPTION 'Elige un video válido' USING ERRCODE='22023';
  END IF;
  NEW.text:=btrim(NEW.text,E' \t\r\n');
  IF NEW.text IS NULL OR char_length(NEW.text)>300 OR (NEW.sticker_id IS NULL AND NEW.image_path IS NULL AND char_length(NEW.text)<1) THEN
    RAISE EXCEPTION 'Escribe entre 1 y 300 caracteres' USING ERRCODE='22023';
  END IF;
  IF NEW.sticker_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sticker_catalog WHERE id=NEW.sticker_id AND active) THEN
    RAISE EXCEPTION 'Este sticker no está disponible' USING ERRCODE='22023';
  END IF;
  IF NEW.image_path IS NOT NULL AND (
    split_part(NEW.image_path,'/',1) IS DISTINCT FROM auth.uid()::text OR
    NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='comment-images' AND o.name=NEW.image_path)
  ) THEN RAISE EXCEPTION 'La imagen no pertenece a tu cuenta o no terminó de subir' USING ERRCODE='42501'; END IF;
  SELECT username,avatar_url INTO v_profile FROM public.profiles WHERE id=NEW.user_id;
  IF NOT FOUND OR v_profile.username IS NULL THEN
    RAISE EXCEPTION 'No se encontró el perfil de tu cuenta' USING ERRCODE='22023';
  END IF;
  NEW.username:=v_profile.username; NEW.avatar_url:=v_profile.avatar_url; NEW.created_at:=now();
  NEW.likes_count:=0; NEW.reply_count:=0; NEW.root_id:=NULL; NEW.reply_to_username:=NULL;
  NEW.deleted_at:=NULL; NEW.edited_at:=NULL;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT coalesce(root_id,id) INTO v_root FROM public.comments WHERE id=NEW.parent_id;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
    SELECT * INTO v_parent FROM public.comments WHERE id=NEW.parent_id;
    IF NOT FOUND OR v_parent.video_id IS DISTINCT FROM NEW.video_id OR v_parent.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Este comentario ya no está disponible para responder' USING ERRCODE='22023';
    END IF;
    NEW.root_id:=coalesce(v_parent.root_id,v_parent.id); NEW.reply_to_username:=v_parent.username;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION tokvid_internal.validate_feed_comment_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at AND (NEW.text IS DISTINCT FROM OLD.text OR NEW.sticker_id IS DISTINCT FROM OLD.sticker_id) THEN
    IF OLD.deleted_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Solo puedes editar tus propios comentarios activos' USING ERRCODE='42501';
    END IF;
    NEW.text:=btrim(NEW.text,E' \t\r\n');
    IF NEW.text IS NULL OR char_length(NEW.text)>300 OR (NEW.sticker_id IS NULL AND NEW.image_path IS NULL AND char_length(NEW.text)<1) THEN
      RAISE EXCEPTION 'Escribe un comentario o elige un sticker; máximo 300 caracteres' USING ERRCODE='22023';
    END IF;
    IF NEW.sticker_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sticker_catalog WHERE id=NEW.sticker_id AND active) THEN
      RAISE EXCEPTION 'Este sticker no está disponible' USING ERRCODE='22023';
    END IF;
    NEW.edited_at:=now();
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_feed_comment_with_image(p_video_id text, p_text text, p_parent_id uuid, p_request_id text, p_image_path text)
 RETURNS SETOF comments
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid := auth.uid(); v_comment public.comments;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR char_length(p_request_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Falta el identificador de envío' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_comment FROM public.comments WHERE user_id=v_actor AND client_request_id=p_request_id;
  IF NOT FOUND THEN
    INSERT INTO public.comments (video_id,user_id,text,parent_id,client_request_id,image_path)
    VALUES (p_video_id,v_actor,p_text,p_parent_id,p_request_id,p_image_path)
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
  IF v_comment.image_path IS DISTINCT FROM p_image_path OR v_comment.id IS NULL OR v_comment.video_id IS DISTINCT FROM p_video_id
     OR v_comment.parent_id IS DISTINCT FROM p_parent_id
     OR v_comment.text IS DISTINCT FROM btrim(p_text,E' \t\r\n') THEN
    RAISE EXCEPTION 'Este envío ya pertenece a otro comentario' USING ERRCODE='22023';
  END IF;
  RETURN NEXT v_comment;
END;
$function$
;
REVOKE ALL ON FUNCTION public.create_feed_comment_with_image(text,text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_feed_comment_with_image(text,text,uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_feed_comment_counts(p_video_ids text[])
 RETURNS TABLE(video_id text, total integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  IF coalesce(cardinality(p_video_ids),0)>100 THEN RAISE EXCEPTION 'Se pueden consultar hasta 100 videos por solicitud' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT ids.id,count(c.id)::integer FROM (SELECT DISTINCT unnest(p_video_ids) AS id) ids
    LEFT JOIN public.comments c ON c.video_id=ids.id AND c.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM public.dismissed_feed_comments d WHERE d.user_id=(SELECT auth.uid())
      AND d.video_id=c.video_id AND (d.comment_id=c.id OR d.comment_id=c.root_id)) GROUP BY ids.id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_feed_reply_counts(p_root_ids uuid[])
RETURNS TABLE(root_id uuid,total integer) LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN
 IF coalesce(cardinality(p_root_ids),0)>100 THEN RAISE EXCEPTION 'Máximo 100 hilos' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT ids.id,count(c.id)::integer FROM (SELECT DISTINCT unnest(p_root_ids) id) ids
 LEFT JOIN public.comments c ON c.root_id=ids.id AND c.deleted_at IS NULL AND NOT EXISTS(
 SELECT 1 FROM public.dismissed_feed_comments d WHERE d.user_id=(SELECT auth.uid()) AND d.video_id=c.video_id
 AND (d.comment_id=c.id OR d.comment_id=c.root_id)) GROUP BY ids.id;
END $$;
REVOKE ALL ON FUNCTION public.get_feed_reply_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_reply_counts(uuid[]) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.suggest_feed_comment_mentions(p_video_id text,p_query text)
RETURNS TABLE(id uuid,username text,avatar_url text) LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT p.id,p.username,p.avatar_url FROM public.profiles p
 WHERE (SELECT auth.uid()) IS NOT NULL AND p.username IS NOT NULL
 AND left(lower(p.username),char_length(left(p_query,50)))=lower(left(p_query,50))
 AND (EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id=(SELECT auth.uid()) AND f.following_id=p.id)
 OR EXISTS(SELECT 1 FROM public.comments c WHERE c.video_id=p_video_id AND c.user_id=p.id AND c.deleted_at IS NULL))
 ORDER BY lower(p.username),p.id LIMIT 10
$$;
REVOKE ALL ON FUNCTION public.suggest_feed_comment_mentions(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.suggest_feed_comment_mentions(text,text) TO authenticated;
