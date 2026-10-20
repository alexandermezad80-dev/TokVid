-- Personal deletion is an account preference, separate from Hide/Show and
-- from remove_feed_comment (the existing author-only global deletion RPC).
create table public.dismissed_feed_comments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  video_id text not null,
  primary key (user_id, comment_id)
);
create index dismissed_feed_comments_comment on public.dismissed_feed_comments(comment_id);
create index dismissed_feed_comments_video on public.dismissed_feed_comments(user_id, video_id);
alter table public.dismissed_feed_comments enable row level security;
revoke all on public.dismissed_feed_comments from public, anon, authenticated;
grant select, insert on public.dismissed_feed_comments to authenticated;
create policy dismissed_feed_comments_read_own on public.dismissed_feed_comments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy dismissed_feed_comments_insert_own on public.dismissed_feed_comments
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.comments c where c.id = comment_id
        and c.user_id = (select auth.uid()) and c.video_id = dismissed_feed_comments.video_id
        and c.deleted_at is null
    )
  );
