begin;

drop policy if exists "Users can insert their own private profile" on public.profile_private;
create policy "Users can insert their own private profile"
  on public.profile_private
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own private profile" on public.profile_private;
create policy "Users can read their own private profile"
  on public.profile_private
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own private profile" on public.profile_private;
create policy "Users can update their own private profile"
  on public.profile_private
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "sender update own messages" on public.messages;
create policy "sender update own messages"
  on public.messages
  for update
  to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

drop policy if exists "own delete video_likes" on public.video_likes;
create policy "own delete video_likes"
  on public.video_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own insert video_likes" on public.video_likes;
create policy "own insert video_likes"
  on public.video_likes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own select video_likes" on public.video_likes;
create policy "own select video_likes"
  on public.video_likes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "owner insert video_hashtags" on public.video_hashtags;
create policy "owner insert video_hashtags"
  on public.video_hashtags
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.videos v
      where v.id = video_hashtags.video_id
        and v.user_id = (select auth.uid())
    )
  );

drop policy if exists "participant update conversation metadata" on public.conversations;
create policy "participant update conversation metadata"
  on public.conversations
  for update
  to authenticated
  using (
    (select auth.uid()) = user1_id
    or (select auth.uid()) = user2_id
  )
  with check (
    (select auth.uid()) = user1_id
    or (select auth.uid()) = user2_id
  );

commit;
