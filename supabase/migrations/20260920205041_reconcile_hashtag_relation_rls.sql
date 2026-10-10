drop policy if exists "video_hashtags insert" on public.video_hashtags;

drop policy if exists "owner insert video_hashtags" on public.video_hashtags;

create policy "owner insert video_hashtags"
on public.video_hashtags
for insert
to authenticated
with check (
  exists (
    select 1 from public.videos v
    where v.id = video_id and v.user_id = auth.uid()
  )
);
