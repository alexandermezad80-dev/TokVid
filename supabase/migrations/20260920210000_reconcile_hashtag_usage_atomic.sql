-- A6: make hashtag usage_count reflect persisted video_hashtags relations.
-- The RPC performs ownership validation, relation creation, and counter
-- increment in one transaction so failed/duplicate links do not inflate counts.

begin;

drop function if exists public.upsert_hashtag(text);

create or replace function public.upsert_hashtag(
  p_tag text,
  p_video_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag text;
  v_hashtag_id uuid;
  v_video_owner uuid;
  v_linked_hashtag_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_tag := lower(trim(p_tag));

  if v_tag = '' then
    raise exception 'Hashtag cannot be empty';
  end if;

  select user_id
    into v_video_owner
  from public.videos
  where id = p_video_id;

  if v_video_owner is null then
    raise exception 'Video not found';
  end if;

  if v_video_owner <> auth.uid() then
    raise exception 'Not allowed to tag this video';
  end if;

  insert into public.hashtags (tag, usage_count)
  values (v_tag, 0)
  on conflict (tag) do nothing
  returning id into v_hashtag_id;

  if v_hashtag_id is null then
    select id
      into v_hashtag_id
    from public.hashtags
    where tag = v_tag;
  end if;

  insert into public.video_hashtags (video_id, hashtag_id)
  values (p_video_id, v_hashtag_id)
  on conflict (video_id, hashtag_id) do nothing
  returning hashtag_id into v_linked_hashtag_id;

  if v_linked_hashtag_id is not null then
    update public.hashtags
    set usage_count = usage_count + 1
    where id = v_hashtag_id;
  end if;

  return v_hashtag_id;
end;
$$;

revoke execute on function public.upsert_hashtag(text, uuid) from public;
revoke execute on function public.upsert_hashtag(text, uuid) from anon;
grant execute on function public.upsert_hashtag(text, uuid) to authenticated;

-- Reconcile historical counts with the actual persisted relations.
update public.hashtags h
set usage_count = (
  select count(*)
  from public.video_hashtags vh
  where vh.hashtag_id = h.id
);

commit;
