-- Public comment authors may remove their whole root thread, anywhere.
-- Publication owners may moderate comments on their own persisted videos.
-- A reply removal preserves all other replies, including replies to that reply.
CREATE FUNCTION tokvid_internal.remove_feed_comment(p_comment_id uuid)
RETURNS TABLE(id uuid,removed boolean,deleted_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); target public.comments; v_root uuid; parent_name text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM public.comments c WHERE c.id=p_comment_id;
  IF NOT FOUND THEN RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz; RETURN; END IF;
  IF target.user_id IS DISTINCT FROM actor AND NOT EXISTS(
    SELECT 1 FROM public.videos v WHERE v.id::text=target.video_id AND v.user_id=actor
  ) THEN RAISE EXCEPTION 'Solo puedes eliminar tus mensajes o moderar tus publicaciones' USING ERRCODE='42501'; END IF;
  v_root:=coalesce(target.root_id,target.id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  SELECT * INTO target FROM public.comments c WHERE c.id=p_comment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz; RETURN; END IF;
  IF target.user_id IS DISTINCT FROM actor AND NOT EXISTS(
    SELECT 1 FROM public.videos v WHERE v.id::text=target.video_id AND v.user_id=actor
  ) THEN RAISE EXCEPTION 'Solo puedes eliminar tus mensajes o moderar tus publicaciones' USING ERRCODE='42501'; END IF;
  IF target.parent_id IS NOT NULL THEN
    SELECT c.username INTO parent_name FROM public.comments c WHERE c.id=target.parent_id;
    -- Reattach direct children before the parent FK's cascade is invoked.
    -- Their text, author, likes, root and timestamps remain intact.
    UPDATE public.comments c SET parent_id=target.parent_id,reply_to_username=parent_name
      WHERE c.parent_id=target.id AND c.video_id=target.video_id;
  END IF;
  -- The existing root/parent FKs cascade the entire root thread and its likes.
  -- Hidden-thread preferences also disappear through their existing FK.
  DELETE FROM public.comments c WHERE c.id=p_comment_id;
  RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz;
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.remove_feed_comment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION tokvid_internal.remove_feed_comment(uuid) TO authenticated;
CREATE FUNCTION public.remove_feed_comment(p_comment_id uuid)
RETURNS TABLE(id uuid,removed boolean,deleted_at timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT * FROM tokvid_internal.remove_feed_comment(p_comment_id);
$$;
REVOKE ALL ON FUNCTION public.remove_feed_comment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_feed_comment(uuid) TO authenticated;

-- This read follows the videos table's existing visibility policies.
CREATE FUNCTION public.get_feed_comment_owner(p_video_id text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT v.user_id FROM public.videos v WHERE v.id::text=p_video_id;
$$;
REVOKE ALL ON FUNCTION public.get_feed_comment_owner(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_comment_owner(text) TO anon,authenticated;
