-- Real Feed comments: threaded replies, private per-user likes and server counts.
-- Existing comments/video IDs remain valid; no demo users or comments are seeded.
CREATE SCHEMA IF NOT EXISTS tokvid_internal;
REVOKE ALL ON SCHEMA tokvid_internal FROM PUBLIC, anon, authenticated;

ALTER TABLE public.comments
  ADD COLUMN parent_id uuid,
  ADD COLUMN root_id uuid,
  ADD COLUMN reply_to_username text,
  ADD COLUMN likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN reply_count integer NOT NULL DEFAULT 0,
  ADD COLUMN client_request_id text;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_id_video_unique UNIQUE (id, video_id),
  ADD CONSTRAINT comments_parent_video_fkey FOREIGN KEY (parent_id, video_id)
    REFERENCES public.comments (id, video_id) ON DELETE CASCADE,
  ADD CONSTRAINT comments_root_video_fkey FOREIGN KEY (root_id, video_id)
    REFERENCES public.comments (id, video_id) ON DELETE CASCADE,
  ADD CONSTRAINT comments_nonnegative_counts CHECK (likes_count >= 0 AND reply_count >= 0),
  ADD CONSTRAINT comments_request_length CHECK (client_request_id IS NULL OR char_length(client_request_id) BETWEEN 1 AND 128);
CREATE UNIQUE INDEX comments_user_request_idx ON public.comments (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
CREATE INDEX comments_video_roots_created_idx ON public.comments (video_id, created_at DESC, id DESC)
  WHERE parent_id IS NULL;
CREATE INDEX comments_root_created_idx ON public.comments (root_id, created_at, id);
CREATE INDEX comments_parent_id_idx ON public.comments (parent_id);
CREATE INDEX comments_video_id_created_idx ON public.comments (video_id, created_at DESC, id DESC);

CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX comment_likes_user_id_idx ON public.comment_likes (user_id, comment_id);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY comment_likes_read_own ON public.comment_likes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY comment_likes_insert_own ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY comment_likes_delete_own ON public.comment_likes FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
REVOKE ALL ON public.comment_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.comment_likes TO authenticated;
GRANT INSERT (comment_id,user_id) ON public.comment_likes TO authenticated;

-- Keep legacy comment inserts compatible, but derive identity and counts on the server.
-- Clients cannot update content, ownership, parent links or cached counters directly.
REVOKE ALL ON public.comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT DELETE ON public.comments TO authenticated;
GRANT INSERT (video_id, user_id, username, avatar_url, text, parent_id, client_request_id)
  ON public.comments TO authenticated;

CREATE FUNCTION tokvid_internal.validate_feed_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_profile record; v_parent record;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Inicia sesión para publicar con tu cuenta' USING ERRCODE='42501';
  END IF;
  IF NEW.video_id IS NULL OR char_length(btrim(NEW.video_id)) NOT BETWEEN 1 AND 256 THEN
    RAISE EXCEPTION 'Elige un video válido' USING ERRCODE='22023';
  END IF;
  NEW.text := btrim(NEW.text, E' \t\r\n');
  IF NEW.text IS NULL OR char_length(NEW.text) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Escribe entre 1 y 300 caracteres' USING ERRCODE='22023';
  END IF;
  SELECT username, avatar_url INTO v_profile FROM public.profiles WHERE id=NEW.user_id;
  IF NOT FOUND OR v_profile.username IS NULL THEN
    RAISE EXCEPTION 'No se encontró el perfil de tu cuenta' USING ERRCODE='22023';
  END IF;
  NEW.username := v_profile.username;
  NEW.avatar_url := v_profile.avatar_url;
  NEW.created_at := now();
  NEW.likes_count := 0;
  NEW.reply_count := 0;
  NEW.root_id := NULL;
  NEW.reply_to_username := NULL;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT id, video_id, root_id, username INTO v_parent FROM public.comments WHERE id=NEW.parent_id;
    IF NOT FOUND OR v_parent.video_id IS DISTINCT FROM NEW.video_id THEN
      RAISE EXCEPTION 'La respuesta debe pertenecer al mismo video' USING ERRCODE='22023';
    END IF;
    NEW.root_id := coalesce(v_parent.root_id, v_parent.id);
    NEW.reply_to_username := v_parent.username;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.validate_feed_comment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_feed_comment BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.validate_feed_comment();

-- Definer rights are limited to internal triggers that maintain protected counters.
-- Neither function is exposed to the Data API or executable by client roles.
CREATE FUNCTION tokvid_internal.sync_feed_reply_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.root_id IS NOT NULL THEN
    UPDATE public.comments SET reply_count=reply_count+1 WHERE id=NEW.root_id;
  ELSIF TG_OP='DELETE' AND OLD.root_id IS NOT NULL THEN
    UPDATE public.comments SET reply_count=greatest(reply_count-1,0) WHERE id=OLD.root_id;
  END IF;
  RETURN coalesce(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.sync_feed_reply_count() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_feed_reply_count AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.sync_feed_reply_count();

CREATE FUNCTION tokvid_internal.sync_feed_comment_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.comments SET likes_count=likes_count+1 WHERE id=NEW.comment_id;
  ELSE
    UPDATE public.comments SET likes_count=greatest(likes_count-1,0) WHERE id=OLD.comment_id;
  END IF;
  RETURN coalesce(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.sync_feed_comment_likes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_feed_comment_likes AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.sync_feed_comment_likes();

CREATE FUNCTION public.create_feed_comment(p_video_id text, p_text text, p_parent_id uuid, p_request_id text)
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
        CASE WHEN p_parent_id IS NULL THEN 'Comentó tu video' ELSE 'Respondió a tu comentario' END,
        jsonb_build_object('video_id',p_video_id,'comment_id',v_comment.id,'parent_id',p_parent_id)
      FROM (
        SELECT user_id AS recipient FROM public.videos WHERE id::text=p_video_id
        UNION
        SELECT user_id FROM public.comments WHERE id=p_parent_id
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

CREATE FUNCTION public.set_feed_comment_like(p_comment_id uuid, p_liked boolean)
RETURNS SETOF public.comments LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  IF p_liked IS NULL THEN RAISE EXCEPTION 'Falta el estado de Me gusta' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.comments WHERE id=p_comment_id) THEN
    RAISE EXCEPTION 'El comentario ya no existe' USING ERRCODE='22023';
  END IF;
  IF p_liked THEN
    INSERT INTO public.comment_likes (comment_id,user_id) VALUES (p_comment_id,v_actor) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.comment_likes WHERE comment_id=p_comment_id AND user_id=v_actor;
  END IF;
  RETURN QUERY SELECT * FROM public.comments WHERE id=p_comment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_feed_comment_like(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_feed_comment_like(uuid,boolean) TO authenticated;

CREATE FUNCTION public.get_feed_comment_counts(p_video_ids text[])
RETURNS TABLE (video_id text, total integer)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF coalesce(cardinality(p_video_ids),0)>100 THEN
    RAISE EXCEPTION 'Se pueden consultar hasta 100 videos por solicitud' USING ERRCODE='22023';
  END IF;
  RETURN QUERY SELECT ids.id, count(c.id)::integer
    FROM (SELECT DISTINCT unnest(p_video_ids) AS id) ids
    LEFT JOIN public.comments c ON c.video_id=ids.id
    GROUP BY ids.id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_feed_comment_counts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_comment_counts(text[]) TO anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
