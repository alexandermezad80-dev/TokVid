LOCK TABLE public.video_likes IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE public.feed_video_like_counts (
  video_id text PRIMARY KEY CHECK (char_length(video_id) BETWEEN 1 AND 256),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0)
);
ALTER TABLE public.feed_video_like_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read feed video like totals" ON public.feed_video_like_counts
  FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.feed_video_like_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.feed_video_like_counts TO anon, authenticated;

INSERT INTO public.feed_video_like_counts(video_id,total)
SELECT video_id,count(*)::integer FROM public.video_likes GROUP BY video_id;

CREATE FUNCTION tokvid_internal.sync_feed_video_like_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.feed_video_like_counts(video_id,total) VALUES(NEW.video_id,1)
    ON CONFLICT(video_id) DO UPDATE SET total=public.feed_video_like_counts.total+1;
  ELSE
    UPDATE public.feed_video_like_counts SET total=greatest(0,total-1) WHERE video_id=OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION tokvid_internal.sync_feed_video_like_total() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_feed_video_like_total AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION tokvid_internal.sync_feed_video_like_total();

CREATE FUNCTION public.get_feed_video_like_counts(p_video_ids text[])
RETURNS TABLE(video_id text,total integer) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF cardinality(p_video_ids)>100 THEN
    RAISE EXCEPTION 'Consulta como máximo 100 videos' USING ERRCODE='22023';
  END IF;
  RETURN QUERY SELECT requested.id,coalesce(totals.total,0)
    FROM (SELECT DISTINCT unnest(p_video_ids) AS id) requested
    LEFT JOIN public.feed_video_like_counts totals ON totals.video_id=requested.id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_feed_video_like_counts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_video_like_counts(text[]) TO anon, authenticated;

CREATE FUNCTION public.set_feed_video_like(p_video_id text,p_liked boolean)
RETURNS TABLE(video_id text,total integer,liked boolean) LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor uuid:=auth.uid(); inserted boolean:=false; recipient uuid; actor_profile record;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Inicia sesión para continuar' USING ERRCODE='42501'; END IF;
  IF p_video_id IS NULL OR char_length(btrim(p_video_id)) NOT BETWEEN 1 AND 256 OR p_liked IS NULL THEN
    RAISE EXCEPTION 'Elige un video válido' USING ERRCODE='22023';
  END IF;
  IF p_liked THEN
    INSERT INTO public.video_likes(user_id,video_id) VALUES(actor,p_video_id)
      ON CONFLICT DO NOTHING;
    inserted:=FOUND;
    IF inserted THEN
      SELECT videos.user_id INTO recipient FROM public.videos videos WHERE videos.id::text=p_video_id;
      IF recipient IS NOT NULL AND recipient<>actor THEN
        SELECT username,avatar_url INTO actor_profile FROM public.profiles WHERE id=actor;
        INSERT INTO public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data)
          VALUES(recipient,actor,actor_profile.username,actor_profile.avatar_url,'like','Le dio me gusta a tu video',jsonb_build_object('video_id',p_video_id));
      END IF;
    END IF;
  ELSE
    DELETE FROM public.video_likes likes WHERE likes.user_id=actor AND likes.video_id=p_video_id;
  END IF;
  RETURN QUERY SELECT p_video_id,coalesce(totals.total,0),
    EXISTS(SELECT 1 FROM public.video_likes own WHERE own.user_id=actor AND own.video_id=p_video_id)
    FROM (SELECT p_video_id AS id) requested
    LEFT JOIN public.feed_video_like_counts totals ON totals.video_id=requested.id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_feed_video_like(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_feed_video_like(text,boolean) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_video_like_counts;
NOTIFY pgrst,'reload schema';
