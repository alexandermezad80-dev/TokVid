create table public.profile_visit_events(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,profile_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now());
alter table public.profile_visit_events enable row level security;
revoke all on public.profile_visit_events from public,anon,authenticated;
grant select,insert on public.profile_visit_events to authenticated;
create policy "read own visits" on public.profile_visit_events for select to authenticated using(user_id=(select auth.uid()));
create policy "record own visits" on public.profile_visit_events for insert to authenticated with check(user_id=(select auth.uid()) and profile_id<>user_id);
create index profile_visit_events_user_idx on public.profile_visit_events(user_id);
create index profile_visit_events_profile_idx on public.profile_visit_events(profile_id);
create or replace function public.record_profile_visit(p_other_id uuid,p_event_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare author public.profiles; inserted integer;
begin
 if auth.uid() is null or p_other_id=auth.uid() or p_event_id is null or private.chat_blocked(p_other_id) then return; end if;
 if not exists(select 1 from public.profiles where id=p_other_id) then return; end if;
 insert into public.profile_visit_events(id,user_id,profile_id) values(p_event_id,auth.uid(),p_other_id) on conflict(id) do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return;end if;
 select * into author from public.profiles where id=auth.uid();
 insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data)
 values(p_other_id,auth.uid(),author.username,author.avatar_url,'profile_visit','Visitó tu perfil',jsonb_build_object('profileId',auth.uid(),'visitId',p_event_id));
end $$;
