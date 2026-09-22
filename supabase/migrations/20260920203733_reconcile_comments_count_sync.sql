create or replace function public.sync_video_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_video_id text;
begin
  target_video_id := coalesce(new.video_id, old.video_id);
  update public.videos
  set comments_count = (
    select count(*)::integer
    from public.comments
    where video_id = target_video_id
  )
  where id::text = target_video_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_comment_change on public.comments;

create trigger on_comment_change
after insert or delete on public.comments
for each row
execute function public.sync_video_comments_count();
