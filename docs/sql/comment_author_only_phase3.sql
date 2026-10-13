-- Restrict the existing removal function to the message author.
-- This migration does not execute a deletion or alter existing comments.
CREATE OR REPLACE FUNCTION tokvid_internal.remove_feed_comment(p_comment_id uuid)
RETURNS TABLE(id uuid, removed boolean, deleted_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE actor uuid:=auth.uid(); target public.comments; v_root uuid; parent_name text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM public.comments c WHERE c.id=p_comment_id;
  IF NOT FOUND THEN RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz; RETURN; END IF;
  IF target.user_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Solo puedes eliminar tus propios comentarios' USING ERRCODE='42501'; END IF;
  v_root:=coalesce(target.root_id,target.id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_root::text,0));
  SELECT * INTO target FROM public.comments c WHERE c.id=p_comment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz; RETURN; END IF;
  IF target.user_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Solo puedes eliminar tus propios comentarios' USING ERRCODE='42501'; END IF;
  IF target.parent_id IS NOT NULL THEN
    SELECT c.username INTO parent_name FROM public.comments c WHERE c.id=target.parent_id;
    UPDATE public.comments c SET parent_id=target.parent_id,reply_to_username=parent_name
      WHERE c.parent_id=target.id AND c.video_id=target.video_id;
  END IF;
  DELETE FROM public.comments c WHERE c.id=p_comment_id;
  RETURN QUERY SELECT p_comment_id,true,NULL::timestamptz;
END;
$function$;
