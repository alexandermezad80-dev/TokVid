-- Only an author's message is removed; other people's replies survive.
LOCK TABLE public.comments IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.comments ADD COLUMN deleted_at timestamptz, ADD COLUMN edited_at timestamptz;
REVOKE DELETE ON public.comments FROM authenticated;
GRANT UPDATE (text) ON public.comments TO authenticated;
CREATE POLICY comments_update_own_live ON public.comments FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id AND deleted_at IS NULL)
  WITH CHECK ((SELECT auth.uid())=user_id AND deleted_at IS NULL);

-- Updating text cannot change identity, links, timestamps or counters.
CREATE FUNCTION tokvid_internal.validate_feed_comment_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at AND NEW.text IS DISTINCT FROM OLD.text THEN
    IF OLD.deleted_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Solo puedes editar tus propios comentarios activos' USING ERRCODE='42501';
    END IF;
    NEW.text:=btrim(NEW.text,E' \t\r\n');
    IF char_length(NEW.text) NOT BETWEEN 1 AND 300 OR NEW.text IS NULL THEN
      RAISE EXCEPTION 'Escribe entre 1 y 300 caracteres' USING ERRCODE='22023';
    END IF;
    NEW.edited_at:=now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.validate_feed_comment_edit() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_feed_comment_edit BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.validate_feed_comment_edit();

-- Reply insertion, API likes and deletion share a per-thread transaction lock.
-- A reply that waits for a delete rechecks its parent after obtaining the lock.
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
  IF NEW.text IS NULL OR char_length(NEW.text) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Escribe entre 1 y 300 caracteres' USING ERRCODE='22023';
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

CREATE OR REPLACE FUNCTION tokvid_internal.sync_feed_reply_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.root_id IS NOT NULL THEN
    UPDATE public.comments SET reply_count=reply_count+1 WHERE id=NEW.root_id;
  ELSIF TG_OP='DELETE' AND OLD.root_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.comments SET reply_count=greatest(reply_count-1,0) WHERE id=OLD.root_id;
  ELSIF TG_OP='UPDATE' AND OLD.root_id IS NOT NULL AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.comments SET reply_count=greatest(reply_count-1,0) WHERE id=OLD.root_id;
  END IF;
  RETURN coalesce(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.sync_feed_reply_count() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_feed_reply_deletion AFTER UPDATE OF deleted_at ON public.comments
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.sync_feed_reply_count();

CREATE FUNCTION tokvid_internal.sync_feed_video_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_video text:=coalesce(NEW.video_id,OLD.video_id); delta integer:=0;
BEGIN
  IF TG_OP='INSERT' AND NEW.deleted_at IS NULL THEN delta:=1;
  ELSIF TG_OP='DELETE' AND OLD.deleted_at IS NULL THEN delta:=-1;
  ELSIF TG_OP='UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN delta:=-1;
  END IF;
  IF delta<>0 THEN
    UPDATE public.videos SET comments_count=greatest(0,comments_count+delta) WHERE id::text=target_video;
  END IF;
  RETURN coalesce(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.sync_feed_video_comment_count() FROM PUBLIC,anon,authenticated;
DROP TRIGGER on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE OR UPDATE OF deleted_at ON public.comments
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.sync_feed_video_comment_count();
UPDATE public.videos v SET comments_count=(SELECT count(*)::integer FROM public.comments c WHERE c.video_id=v.id::text AND c.deleted_at IS NULL);

CREATE FUNCTION public.edit_feed_comment(p_comment_id uuid,p_text text)
RETURNS SETOF public.comments LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_root uuid; v_row public.comments;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  SELECT coalesce(root_id,id) INTO v_root FROM public.comments WHERE id=p_comment_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes editar tus propios comentarios' USING ERRCODE='42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  UPDATE public.comments SET text=p_text WHERE id=p_comment_id AND user_id=auth.uid() AND deleted_at IS NULL
    RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'El comentario ya no está disponible para editar' USING ERRCODE='22023'; END IF;
  RETURN NEXT v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.edit_feed_comment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edit_feed_comment(uuid,text) TO authenticated;

-- Deletion requires narrowly scoped elevated rights: direct DELETE is revoked
-- to prevent the pre-existing parent/root CASCADE from deleting foreign replies.
-- This function stays in the non-exposed schema, checks auth.uid + ownership,
-- and never deletes live descendants. Public API wrapper is SECURITY INVOKER.
CREATE FUNCTION tokvid_internal.delete_feed_comment(p_comment_id uuid)
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
      UPDATE public.comments c SET text='Comentario eliminado',deleted_at=now(),avatar_url=NULL
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
GRANT USAGE ON SCHEMA tokvid_internal TO authenticated;
GRANT EXECUTE ON FUNCTION tokvid_internal.delete_feed_comment(uuid) TO authenticated;
CREATE FUNCTION public.delete_feed_comment(p_comment_id uuid)
RETURNS TABLE(id uuid,removed boolean,deleted_at timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT * FROM tokvid_internal.delete_feed_comment(p_comment_id);
$$;
REVOKE ALL ON FUNCTION public.delete_feed_comment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_feed_comment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_feed_comment_like(p_comment_id uuid,p_liked boolean)
RETURNS SETOF public.comments LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_root uuid;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  IF p_liked IS NULL THEN RAISE EXCEPTION 'Falta el estado de Me gusta' USING ERRCODE='22023'; END IF;
  SELECT coalesce(root_id,id) INTO v_root FROM public.comments WHERE id=p_comment_id;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=p_comment_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'El comentario ya no está disponible' USING ERRCODE='22023';
  END IF;
  IF p_liked THEN
    INSERT INTO public.comment_likes(comment_id,user_id) VALUES(p_comment_id,actor) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.comment_likes WHERE comment_id=p_comment_id AND user_id=actor;
  END IF;
  RETURN QUERY SELECT * FROM public.comments WHERE id=p_comment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_feed_comment_like(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_feed_comment_like(uuid,boolean) TO authenticated;

-- Enforce the deleted state for legacy clients that INSERT likes directly.
CREATE FUNCTION tokvid_internal.reject_deleted_comment_like()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_root uuid;
BEGIN
  SELECT coalesce(root_id,id) INTO v_root FROM public.comments WHERE id=NEW.comment_id;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=NEW.comment_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'El comentario ya no está disponible' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.reject_deleted_comment_like() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reject_deleted_comment_like BEFORE INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.reject_deleted_comment_like();

CREATE OR REPLACE FUNCTION public.get_feed_comment_counts(p_video_ids text[])
RETURNS TABLE(video_id text,total integer) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF coalesce(cardinality(p_video_ids),0)>100 THEN RAISE EXCEPTION 'Se pueden consultar hasta 100 videos por solicitud' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT ids.id,count(c.id)::integer FROM (SELECT DISTINCT unnest(p_video_ids) AS id) ids
    LEFT JOIN public.comments c ON c.video_id=ids.id AND c.deleted_at IS NULL GROUP BY ids.id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_feed_comment_counts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_comment_counts(text[]) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
