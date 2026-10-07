-- Cover both columns of the same-video reply foreign keys and reply pagination.
CREATE INDEX comments_parent_video_idx ON public.comments(parent_id,video_id);
CREATE INDEX comments_root_video_created_idx ON public.comments(root_id,video_id,created_at DESC,id DESC);
DROP INDEX public.comments_parent_id_idx;
DROP INDEX public.comments_root_created_idx;
