alter table public.videos add column if not exists media_type text not null default 'video';
alter table public.videos add constraint videos_media_type_check check (media_type in ('video', 'image'));
update storage.buckets set allowed_mime_types = array['video/mp4','video/quicktime','image/jpeg','image/png','image/webp'] where id = 'videos';
create policy "Owners read own publication upload metadata" on storage.objects for select to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
comment on column public.videos.media_type is 'Publication media type: video or image. Existing videos remain video.';
