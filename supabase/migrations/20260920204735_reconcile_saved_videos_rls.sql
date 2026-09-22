create policy "Users can view own saved videos"
on public.saved_videos
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can save videos"
on public.saved_videos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can remove own saved videos"
on public.saved_videos
for delete
to authenticated
using (auth.uid() = user_id);
