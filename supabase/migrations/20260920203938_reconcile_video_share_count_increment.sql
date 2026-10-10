create or replace function public.increment_video_share_count(p_video_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  update public.videos
  set shares_count = shares_count + 1
  where id = p_video_id
  returning shares_count into new_count;
  if new_count is null then
    raise exception 'video not found';
  end if;
  return new_count;
end;
$$;

revoke all on function public.increment_video_share_count(uuid) from public;
grant execute on function public.increment_video_share_count(uuid) to authenticated;
