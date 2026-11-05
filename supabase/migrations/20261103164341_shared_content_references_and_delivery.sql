-- Additive sharing support. Existing likes, saves, messages and original content stay intact.
create table public.story_share_events (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 story_id uuid not null references public.stories(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index story_share_events_user_story_time on public.story_share_events(user_id,story_id,created_at desc);
create index story_share_events_story on public.story_share_events(story_id);
alter table public.story_share_events enable row level security;
revoke all on public.story_share_events from public,anon,authenticated;
grant select on public.story_share_events to authenticated;
grant insert(id,user_id,story_id) on public.story_share_events to authenticated;
create policy "read own story shares" on public.story_share_events for select to authenticated using (user_id=(select auth.uid()));
create policy "record visible story shares" on public.story_share_events for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now())
);
create table public.hidden_shared_content (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('video','story')),
 content_id uuid not null,
 hidden_before timestamptz not null default now(),
 primary key(user_id,kind,content_id)
);
alter table public.hidden_shared_content enable row level security;
revoke all on public.hidden_shared_content from public,anon,authenticated;
grant select,insert,update on public.hidden_shared_content to authenticated;
create policy "read own hidden shares" on public.hidden_shared_content for select to authenticated using(user_id=(select auth.uid()));
create policy "hide own shared references" on public.hidden_shared_content for insert to authenticated with check(user_id=(select auth.uid()));
create policy "update own hidden references" on public.hidden_shared_content for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create function public.record_story_share(p_story_id uuid,p_event_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if not exists(select 1 from public.stories where id=p_story_id and expires_at>now()) then raise exception 'Story unavailable' using errcode='42501';end if;
 insert into public.story_share_events(id,user_id,story_id) values(p_event_id,auth.uid(),p_story_id) on conflict(id) do nothing;
end $$;
revoke all on function public.record_story_share(uuid,uuid) from public,anon;
grant execute on function public.record_story_share(uuid,uuid) to authenticated;

-- One message and one activity for each recipient; retrying the same event cannot duplicate either.
-- Preserve existing creator share activity. If creator=recipient, that existing activity suffices.
create function public.send_shared_content(p_id uuid,p_recipient uuid,p_kind text,p_content_id uuid,p_text text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); conversation uuid; owner_id uuid; author record; saved public.messages;
begin
 if actor is null or p_id is null or p_recipient is null or actor=p_recipient or p_kind not in ('video','story') or p_kind is null or p_text is null or char_length(btrim(p_text))=0 or char_length(p_text)>1000 then
  raise exception 'Invalid shared content' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,1));
 conversation:=public.open_private_conversation(p_recipient);
 select * into saved from public.messages where id=p_id;
 if found then
  if saved.sender_id<>actor or saved.conversation_id<>conversation or saved.text<>p_text or saved.deleted_at is not null then raise exception 'Share retry does not match' using errcode='42501';end if;
  if not ((p_kind='video' and exists(select 1 from public.video_share_events where id=p_id and user_id=actor and video_id=p_content_id))
      or (p_kind='story' and exists(select 1 from public.story_share_events where id=p_id and user_id=actor and story_id=p_content_id))) then raise exception 'Share retry does not match' using errcode='42501';end if;
  return to_jsonb(saved);
 end if;
 if p_kind='video' then select user_id into owner_id from public.videos where id=p_content_id;
 else select user_id into owner_id from public.stories where id=p_content_id and expires_at>now();end if;
 if owner_id is null then raise exception 'Shared content unavailable' using errcode='42501';end if;
 insert into public.messages(id,conversation_id,sender_id,text) values(p_id,conversation,actor,p_text) returning * into saved;
 if p_kind='video' then perform public.record_video_share(p_content_id,p_id);
 else perform public.record_story_share(p_content_id,p_id);end if;
 if not ((p_kind='video' and exists(select 1 from public.video_share_events where id=p_id and user_id=actor and video_id=p_content_id)) or (p_kind='story' and exists(select 1 from public.story_share_events where id=p_id and user_id=actor and story_id=p_content_id))) then raise exception 'Share event does not match' using errcode='42501';end if;
 if p_kind='story' or owner_id<>p_recipient then
  select username,avatar_url into author from public.profiles where id=actor;
  insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data)
  values(p_recipient,actor,author.username,author.avatar_url,'share',case when p_kind='story' then 'Te compartió una historia' else 'Te compartió una publicación' end,
   jsonb_build_object('sharedToYou',true,'conversationId',conversation,'messageId',p_id)||
   case when p_kind='story' then jsonb_build_object('storyId',p_content_id,'storyUserId',owner_id) else jsonb_build_object('videoId',p_content_id) end);
 end if;
 return to_jsonb(saved);
end $$;
revoke all on function public.send_shared_content(uuid,uuid,text,uuid,text) from public,anon;
grant execute on function public.send_shared_content(uuid,uuid,text,uuid,text) to authenticated;

-- The privileged function exposes references only after explicit account/visibility authorization.
-- Clients still re-read the actual publication/story under caller RLS.
create function private.profile_shared_content(p_user uuid,p_offset integer)
returns table(content_id uuid,kind text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_user is null or p_offset is null or p_offset<0 then raise exception 'Invalid profile request' using errcode='42501';end if;
 if auth.uid()<>p_user and not exists(select 1 from public.profile_visibility where user_id=p_user and show_shares) then return;end if;
 return query
 with refs as (
  select e.video_id as id,'video'::text as k,max(e.created_at) as stamp from public.video_share_events e
   join public.videos v on v.id=e.video_id where e.user_id=p_user and v.user_id<>p_user and coalesce(v.media_type,'video')='video'
   group by e.video_id
  union all
  select e.story_id,'story'::text,max(e.created_at) from public.story_share_events e
   join public.stories s on s.id=e.story_id where e.user_id=p_user and s.expires_at>now()
   group by e.story_id
 ) select r.id,r.k,r.stamp from refs r
 where not exists(select 1 from public.hidden_shared_content h where h.user_id=p_user and h.kind=r.k and h.content_id=r.id and h.hidden_before>=r.stamp)
 order by r.stamp desc,r.id,r.k limit 60 offset p_offset;
end $$;
revoke all on function private.profile_shared_content(uuid,integer) from public,anon;
grant execute on function private.profile_shared_content(uuid,integer) to authenticated;
create function public.profile_shared_content(p_user uuid,p_offset integer default 0)
returns table(content_id uuid,kind text,created_at timestamptz)
language sql security invoker set search_path='' as $$select * from private.profile_shared_content(p_user,p_offset);$$;
revoke all on function public.profile_shared_content(uuid,integer) from public,anon;
grant execute on function public.profile_shared_content(uuid,integer) to authenticated;

create function public.remove_shared_reference(p_kind text,p_content_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or p_kind is null or p_kind not in ('video','story') or p_content_id is null then raise exception 'Invalid reference' using errcode='42501';end if;
 if not ((p_kind='video' and exists(select 1 from public.video_share_events where user_id=auth.uid() and video_id=p_content_id))
      or (p_kind='story' and exists(select 1 from public.story_share_events where user_id=auth.uid() and story_id=p_content_id))) then return false;end if;
 insert into public.hidden_shared_content(user_id,kind,content_id,hidden_before) values(auth.uid(),p_kind,p_content_id,clock_timestamp())
 on conflict(user_id,kind,content_id) do update set hidden_before=excluded.hidden_before;
 return true;
end $$;
revoke all on function public.remove_shared_reference(text,uuid) from public,anon;
grant execute on function public.remove_shared_reference(text,uuid) to authenticated;

-- Existing video RLS permits public reads. Stream these same public totals; keep
-- saved_videos and all private relation policies unchanged.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='videos') then
  alter publication supabase_realtime add table public.videos;
 end if;
end $$;
