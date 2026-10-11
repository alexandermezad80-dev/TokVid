create table public.video_share_events(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 video_id uuid not null references public.videos(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.video_share_events enable row level security;
revoke all on public.video_share_events from public,anon,authenticated;
grant select,insert on public.video_share_events to authenticated;
create policy "own share events" on public.video_share_events for select to authenticated using(user_id=(select auth.uid()));
create policy "create own share event" on public.video_share_events for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.videos v where v.id=video_id));
create index video_share_events_user_idx on public.video_share_events(user_id);
create index video_share_events_video_idx on public.video_share_events(video_id);
create function public.record_video_share(p_video_id uuid,p_event_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare recipient uuid; author public.profiles; inserted integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select user_id into recipient from public.videos where id=p_video_id;
 if recipient is null then raise exception 'Publication unavailable';end if;
 insert into public.video_share_events(id,user_id,video_id) values(p_event_id,auth.uid(),p_video_id) on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return;end if;
 perform public.increment_video_share_count(p_video_id);
 if recipient<>auth.uid() and not private.chat_blocked(recipient) then
  select * into author from public.profiles where id=auth.uid();
  insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data) values(recipient,auth.uid(),author.username,author.avatar_url,'share','Compartió tu publicación',jsonb_build_object('videoId',p_video_id));
 end if;
end $$;
revoke all on function public.record_video_share(uuid,uuid) from public,anon;
grant execute on function public.record_video_share(uuid,uuid) to authenticated;
