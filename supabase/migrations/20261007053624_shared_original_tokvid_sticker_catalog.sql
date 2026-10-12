-- Shared real original TOKVID catalog; artwork is bundled in the APK, no external provider.
CREATE TABLE public.sticker_catalog (
  id text PRIMARY KEY CHECK(char_length(id) BETWEEN 1 AND 64),
  label text NOT NULL CHECK(char_length(label) BETWEEN 1 AND 64),
  asset_sha256 text NOT NULL CHECK(asset_sha256 ~ '^[0-9a-f]{64}$'),
  sort_order integer NOT NULL,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.sticker_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY sticker_catalog_public_read ON public.sticker_catalog FOR SELECT TO anon,authenticated USING(true);
REVOKE ALL ON public.sticker_catalog FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.sticker_catalog TO anon,authenticated;
INSERT INTO public.sticker_catalog(id,label,asset_sha256,sort_order) VALUES
('tokvid_risa_01','Risa','24288178b53d2484732d7fdb538d653ab978fe92e2907c50b7ad4fc4738d873f',0),
('tokvid_carino_01','Cariño','8e9be073cece99b932737c06685b12e2f165e5b039b00876c0e8bbff9c61f612',1),
('tokvid_sorpresa_01','Sorpresa','7138e096d88a38002f188e97ddb17dcab8651ebd1b16cfa33d962ea9e2a26d62',2),
('tokvid_aplausos_01','Aplausos','7e2b5fec6b0a31808c6d252001b046e1a82d9113a59e922d426b7e045151c2ed',3),
('tokvid_celebracion_01','Celebración','a93bf15580c4fdf9fc4ce6f7d5ff316bc7ed727beb0eb471a5da958d86b49c8d',4),
('tokvid_fuego_01','Fuego','f35fb0a885145abb7529b1128f823169e4355402f8aaab01e999d1e0c1eced9f',5);
ALTER TABLE public.comments ADD COLUMN sticker_id text REFERENCES public.sticker_catalog(id) ON DELETE RESTRICT;
CREATE INDEX comments_sticker_id_idx ON public.comments(sticker_id) WHERE sticker_id IS NOT NULL;
GRANT INSERT(sticker_id),UPDATE(sticker_id) ON public.comments TO authenticated;
CREATE OR REPLACE FUNCTION tokvid_internal.validate_feed_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_profile record; v_parent public.comments; v_root uuid;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Inicia sesión para publicar con tu cuenta' USING ERRCODE='42501';
  END IF;
  IF NEW.video_id IS NULL OR char_length(btrim(NEW.video_id)) NOT BETWEEN 1 AND 256 THEN
    RAISE EXCEPTION 'Elige un video válido' USING ERRCODE='22023';
  END IF;
  NEW.text:=btrim(NEW.text,E' \t\r\n');
  IF NEW.text IS NULL OR char_length(NEW.text)>300 OR (NEW.sticker_id IS NULL AND char_length(NEW.text)<1) THEN
    RAISE EXCEPTION 'Escribe entre 1 y 300 caracteres' USING ERRCODE='22023';
  END IF;
  IF NEW.sticker_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sticker_catalog WHERE id=NEW.sticker_id AND active) THEN
    RAISE EXCEPTION 'Este sticker no está disponible' USING ERRCODE='22023';
  END IF;
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
$$;
REVOKE ALL ON FUNCTION tokvid_internal.validate_feed_comment() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_feed_comment_with_sticker(p_video_id text, p_text text, p_parent_id uuid, p_request_id text,p_sticker_id text)
RETURNS SETOF public.comments LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_comment public.comments;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR char_length(p_request_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'Falta el identificador de envío' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_comment FROM public.comments WHERE user_id=v_actor AND client_request_id=p_request_id;
  IF NOT FOUND THEN
    INSERT INTO public.comments (video_id,user_id,text,parent_id,client_request_id,sticker_id)
    VALUES (p_video_id,v_actor,p_text,p_parent_id,p_request_id,p_sticker_id)
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
     OR v_comment.sticker_id IS DISTINCT FROM p_sticker_id
     OR v_comment.text IS DISTINCT FROM btrim(p_text,E' \t\r\n') THEN
    RAISE EXCEPTION 'Este envío ya pertenece a otro comentario' USING ERRCODE='22023';
  END IF;
  RETURN NEXT v_comment;
END;
$$;
REVOKE ALL ON FUNCTION public.create_feed_comment_with_sticker(text,text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_feed_comment_with_sticker(text,text,uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION tokvid_internal.delete_feed_comment(p_comment_id uuid)
RETURNS TABLE(id uuid,removed boolean,deleted_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); target public.comments; v_root uuid; pruned integer;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM public.comments c WHERE c.id=p_comment_id;
  IF NOT FOUND THEN RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz; RETURN; END IF;
  IF target.user_id<>actor THEN RAISE EXCEPTION 'Solo puedes eliminar tus propios comentarios' USING ERRCODE='42501'; END IF;
  v_root:=coalesce(target.root_id,target.id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  SELECT * INTO target FROM public.comments c WHERE c.id=p_comment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz; RETURN; END IF;
  IF target.user_id<>actor THEN RAISE EXCEPTION 'Solo puedes eliminar tus propios comentarios' USING ERRCODE='42501'; END IF;
  IF target.deleted_at IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.comments c WHERE c.parent_id=target.id OR c.root_id=target.id) THEN
      UPDATE public.comments c SET text='Comentario eliminado',deleted_at=now(),avatar_url=NULL,sticker_id=NULL
        WHERE c.id=target.id RETURNING c.* INTO target;
      DELETE FROM public.comment_likes l WHERE l.comment_id=target.id;
    ELSE
      DELETE FROM public.comments c WHERE c.id=target.id;
    END IF;
  END IF;
  -- Remove only already-deleted, now-empty ancestors. Live replies are untouched.
  LOOP
    DELETE FROM public.comments c WHERE c.deleted_at IS NOT NULL
      AND (c.id=v_root OR c.root_id=v_root)
      AND NOT EXISTS(SELECT 1 FROM public.comments child WHERE child.parent_id=c.id OR child.root_id=c.id);
    GET DIAGNOSTICS pruned=ROW_COUNT;
    EXIT WHEN pruned=0;
  END LOOP;
  RETURN QUERY SELECT p_comment_id,NOT EXISTS(SELECT 1 FROM public.comments c WHERE c.id=p_comment_id),
    (SELECT c.deleted_at FROM public.comments c WHERE c.id=p_comment_id);
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.delete_feed_comment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION tokvid_internal.delete_feed_comment(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION tokvid_internal.validate_feed_comment_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at AND (NEW.text IS DISTINCT FROM OLD.text OR NEW.sticker_id IS DISTINCT FROM OLD.sticker_id) THEN
    IF OLD.deleted_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Solo puedes editar tus propios comentarios activos' USING ERRCODE='42501';
    END IF;
    NEW.text:=btrim(NEW.text,E' \t\r\n');
    IF NEW.text IS NULL OR char_length(NEW.text)>300 OR (NEW.sticker_id IS NULL AND char_length(NEW.text)<1) THEN
      RAISE EXCEPTION 'Escribe un comentario o elige un sticker; máximo 300 caracteres' USING ERRCODE='22023';
    END IF;
    IF NEW.sticker_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sticker_catalog WHERE id=NEW.sticker_id AND active) THEN
      RAISE EXCEPTION 'Este sticker no está disponible' USING ERRCODE='22023';
    END IF;
    NEW.edited_at:=now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.validate_feed_comment_edit() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.edit_feed_comment_content(p_comment_id uuid,p_text text,p_sticker_id text)
RETURNS SETOF public.comments LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_root uuid; v_row public.comments;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  SELECT coalesce(root_id,id) INTO v_root FROM public.comments WHERE id=p_comment_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes editar tus propios comentarios' USING ERRCODE='42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  UPDATE public.comments SET text=p_text,sticker_id=p_sticker_id WHERE id=p_comment_id AND user_id=auth.uid() AND deleted_at IS NULL RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'El comentario ya no está disponible para editar' USING ERRCODE='22023'; END IF;
  RETURN NEXT v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.edit_feed_comment_content(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edit_feed_comment_content(uuid,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
