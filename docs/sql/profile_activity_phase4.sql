-- Phase 4: presentation preferences, activity receipts and personal Inbox clearing.
alter table public.chat_preferences drop constraint chat_preferences_bubble_style_check;
alter table public.chat_preferences add constraint chat_preferences_bubble_style_check check(bubble_style in ('classic','minimal','rounded','glass','gradient','neon','elegant','compact','magenta','glass_graphite','glass_blue'));
-- Keep legacy rounded rows accepted for installed clients; the new client normalizes them.
create table public.profile_visibility(user_id uuid primary key references public.profiles(id) on delete cascade,show_likes boolean not null default false,show_shares boolean not null default false);
alter table public.profile_visibility enable row level security;
revoke all on public.profile_visibility from public,anon,authenticated;
grant select,insert,update on public.profile_visibility to authenticated;
create policy "read public visibility choices" on public.profile_visibility for select to authenticated using(true);
create policy "create own visibility choices" on public.profile_visibility for insert to authenticated with check(user_id=(select auth.uid()));
create policy "update own visibility choices" on public.profile_visibility for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function private.profile_activity_ids(p_user uuid,p_kind text,p_offset integer) returns table(video_id text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_kind not in ('liked','shared') or p_offset<0 then raise exception 'Invalid profile request' using errcode='42501';end if;
 if auth.uid()<>p_user and not exists(select 1 from public.profile_visibility where user_id=p_user and case when p_kind='liked' then show_likes else show_shares end) then return;end if;
 if p_kind='liked' then return query select l.video_id,l.created_at from public.video_likes l where l.user_id=p_user order by l.created_at desc,l.video_id limit 60 offset p_offset;
 else return query select s.video_id::text,max(s.created_at) from public.video_share_events s where s.user_id=p_user group by s.video_id order by max(s.created_at) desc,s.video_id limit 60 offset p_offset;end if;
end $$;
revoke all on function private.profile_activity_ids(uuid,text,integer) from public,anon;
grant execute on function private.profile_activity_ids(uuid,text,integer) to authenticated;
create function public.profile_activity_ids(p_user uuid,p_kind text,p_offset integer default 0) returns table(video_id text,created_at timestamptz)
language sql security invoker set search_path='' as $$select * from private.profile_activity_ids(p_user,p_kind,p_offset);$$;
revoke all on function public.profile_activity_ids(uuid,text,integer) from public,anon;
grant execute on function public.profile_activity_ids(uuid,text,integer) to authenticated;
-- Expose only the explicitly public relationship directory, never private messages/saves.
create function private.profile_connections(p_user uuid,p_kind text,p_offset integer) returns table(id uuid,username text,avatar_url text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_kind not in ('followers','following') or p_offset<0 then raise exception 'Invalid profile request' using errcode='42501';end if;
 return query select p.id,p.username,p.avatar_url from public.follows f join public.profiles p on p.id=case when p_kind='followers' then f.follower_id else f.following_id end
 where case when p_kind='followers' then f.following_id=p_user else f.follower_id=p_user end order by p.username,p.id limit 60 offset p_offset;
end $$;
revoke all on function private.profile_connections(uuid,text,integer) from public,anon;
grant execute on function private.profile_connections(uuid,text,integer) to authenticated;
create function public.profile_connections(p_user uuid,p_kind text,p_offset integer default 0) returns table(id uuid,username text,avatar_url text)
language sql security invoker set search_path='' as $$select * from private.profile_connections(p_user,p_kind,p_offset);$$;
revoke all on function public.profile_connections(uuid,text,integer) from public,anon;
grant execute on function public.profile_connections(uuid,text,integer) to authenticated;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in ('like','comment','follow','mention','system','message','share','profile_visit','comment_like','favorite'));
create index notifications_message_receipt_idx on public.notifications(user_id,(data->>'messageId')) where type='message' and not read;
create function private.receive_message_activity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.read_by_other and not old.read_by_other and auth.uid() is not null and new.sender_id<>auth.uid() then
 update public.notifications set read=true where user_id=auth.uid() and type='message' and data->>'messageId'=new.id::text and not read;
 end if;return new;
end $$;
revoke all on function private.receive_message_activity() from public,anon,authenticated;
create trigger receive_message_activity after update of read_by_other on public.messages for each row execute function private.receive_message_activity();
-- Also reconcile historical receipts when opening a chat; future events are outside the cutoff.
create function public.read_chat_activity(p_conversation_id uuid,p_before timestamptz default clock_timestamp()) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or p_before is null or p_before>clock_timestamp() or not exists(select 1 from public.conversations where id=p_conversation_id) then raise exception 'Invalid conversation' using errcode='42501';end if;
 update public.notifications set read=true where user_id=auth.uid() and type='message' and data->>'conversationId'=p_conversation_id::text and created_at<=p_before and not read;
end $$;
revoke all on function public.read_chat_activity(uuid,timestamptz) from public,anon;
grant execute on function public.read_chat_activity(uuid,timestamptz) to authenticated;

alter table public.videos add column saves_count integer not null default 0 check(saves_count>=0);
update public.videos v set saves_count=(select count(*) from public.saved_videos s where s.video_id=v.id::text);
create function private.saved_video_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v public.videos; actor public.profiles;target text;
begin
 target=case when tg_op='DELETE' then old.video_id else new.video_id end;
 if tg_op='DELETE' then update public.videos set saves_count=greatest(0,saves_count-1) where id::text=target;return old;end if;
 update public.videos set saves_count=saves_count+1 where id::text=target returning * into v;
 if v.id is not null and v.user_id<>new.user_id then
 select * into actor from public.profiles where id=new.user_id;
 insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data) values(v.user_id,new.user_id,actor.username,actor.avatar_url,'favorite','Guardó tu publicación',jsonb_build_object('videoId',v.id));end if;
 return new;
end $$;
revoke all on function private.saved_video_activity() from public,anon,authenticated;
create trigger saved_video_activity after insert or delete on public.saved_videos for each row execute function private.saved_video_activity();
create function private.comment_like_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.comments;actor public.profiles;
begin
 select * into c from public.comments where id=new.comment_id and deleted_at is null;
 if c.id is not null and c.user_id<>new.user_id then
 select * into actor from public.profiles where id=new.user_id;
 insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data) values(c.user_id,new.user_id,actor.username,actor.avatar_url,'comment_like','Le dio me gusta a tu comentario',jsonb_build_object('videoId',c.video_id,'commentId',c.id));end if;return new;
end $$;
revoke all on function private.comment_like_activity() from public,anon,authenticated;
create trigger comment_like_activity after insert on public.comment_likes for each row execute function private.comment_like_activity();

-- A private, per-account history cutoff for groups; no group membership is removed.
create table public.group_history_hides(user_id uuid not null references auth.users(id) on delete cascade,group_id uuid not null references public.chat_groups(id) on delete cascade,hidden_before timestamptz not null,primary key(user_id,group_id));
alter table public.group_history_hides enable row level security;
revoke all on public.group_history_hides from public,anon,authenticated;
grant select,insert,update on public.group_history_hides to authenticated;
create policy "read own group cutoff" on public.group_history_hides for select to authenticated using(user_id=(select auth.uid()));
create policy "insert own group cutoff" on public.group_history_hides for insert to authenticated with check(user_id=(select auth.uid()) and hidden_before<=clock_timestamp() and exists(select 1 from public.chat_group_members m where m.group_id=group_history_hides.group_id and m.user_id=(select auth.uid())));
create policy "update own group cutoff" on public.group_history_hides for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and hidden_before<=clock_timestamp());
create index group_history_hides_group_idx on public.group_history_hides(group_id);
create view public.visible_chat_group_messages with(security_invoker=true) as select m.* from public.chat_group_messages m where not exists(select 1 from public.group_history_hides h where h.user_id=(select auth.uid()) and h.group_id=m.group_id and m.created_at<=h.hidden_before);
revoke all on public.visible_chat_group_messages from public,anon;
grant select on public.visible_chat_group_messages to authenticated;
create or replace view public.chat_group_inbox with(security_invoker=true) as
 select g.id,g.name,coalesce(last_message.text,'Grupo creado') last_message,coalesce(last_message.created_at,g.created_at) last_message_at,
 (select count(*)::int from public.visible_chat_group_messages msg where msg.group_id=g.id and msg.sender_id<>(select auth.uid()) and msg.created_at>member.last_read_at) unread_count
 from public.chat_groups g join public.chat_group_members member on member.group_id=g.id and member.user_id=(select auth.uid())
 left join lateral(select text,created_at from public.visible_chat_group_messages msg where msg.group_id=g.id order by created_at desc,id desc limit 1) last_message on true
 where last_message.created_at is not null or not exists(select 1 from public.group_history_hides h where h.user_id=(select auth.uid()) and h.group_id=g.id and g.created_at<=h.hidden_before);
create function public.inbox_clear_boundary() returns timestamptz language sql security invoker set search_path='' as $$select clock_timestamp() where auth.uid() is not null;$$;
revoke all on function public.inbox_clear_boundary() from public,anon;
grant execute on function public.inbox_clear_boundary() to authenticated;
create function public.clear_own_inbox(p_before timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare c record;
begin
 if auth.uid() is null or p_before is null or p_before>clock_timestamp() then raise exception 'Invalid cutoff' using errcode='42501';end if;
 for c in select id from public.conversations loop perform public.remove_private_messages(c.id,null,false,p_before);end loop;
 insert into public.group_history_hides(user_id,group_id,hidden_before) select auth.uid(),group_id,p_before from public.chat_group_members where user_id=auth.uid()
 on conflict(user_id,group_id) do update set hidden_before=greatest(group_history_hides.hidden_before,excluded.hidden_before);
 update public.chat_group_members set last_read_at=greatest(last_read_at,p_before) where user_id=auth.uid();
 update public.notifications set read=true where user_id=auth.uid() and type='message' and created_at<=p_before and not read;
end $$;
revoke all on function public.clear_own_inbox(timestamptz) from public,anon;
grant execute on function public.clear_own_inbox(timestamptz) to authenticated;
