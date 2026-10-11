-- Additive private chat tools. No existing conversations or messages are deleted.
create table public.chat_preferences (
 user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 bubble_style text not null default 'classic' check (bubble_style in ('classic','minimal','rounded','glass','gradient','neon','elegant','compact')),
 background text not null default 'slate' check (background in ('slate','teal','plum','dark')),
 tone text not null default 'default' check (tone in ('default','soft','none')),
 mute_messages boolean not null default false,
 mute_calls boolean not null default false,
 primary key(user_id,conversation_id)
);
alter table public.chat_preferences enable row level security;
revoke all on public.chat_preferences from public,anon,authenticated;
grant select,insert,update on public.chat_preferences to authenticated;
create policy "own chat preferences" on public.chat_preferences for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.conversations c where c.id=conversation_id));
create index chat_preferences_conversation_idx on public.chat_preferences(conversation_id);

create table public.user_blocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,blocked_id), check(user_id<>blocked_id)
);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public,anon,authenticated;
grant select,insert,delete on public.user_blocks to authenticated;
create policy "manage own blocks" on public.user_blocks for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index user_blocks_blocked_idx on public.user_blocks(blocked_id,user_id);
-- Internal lookup: each account may see only its own block list, but delivery must
-- enforce either participant's block without exposing who blocked whom.
create function private.chat_blocked(p_other uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is null or exists(select 1 from public.user_blocks
 where (user_id=auth.uid() and blocked_id=p_other) or (blocked_id=auth.uid() and user_id=p_other));
$$;
revoke all on function private.chat_blocked(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.chat_blocked(uuid) to authenticated;
create function private.guard_chat_delivery() returns trigger
language plpgsql security invoker set search_path='' as $$
declare recipient uuid;
begin
 if tg_table_name='messages' then
   select case when user1_id=new.sender_id then user2_id else user1_id end into recipient from public.conversations where id=new.conversation_id;
 else recipient:=new.receiver_id;
 end if;
 if auth.uid() is not null and private.chat_blocked(recipient) then
   raise exception 'No se puede contactar a este usuario' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.guard_chat_delivery() from public,anon,authenticated;
create trigger guard_chat_delivery before insert on public.messages for each row execute function private.guard_chat_delivery();

create table public.message_details (
 message_id uuid primary key references public.messages(id) on delete cascade,
 reply_to uuid references public.messages(id) on delete set null,
 forwarded boolean not null default false,
 attachment jsonb
);
alter table public.message_details enable row level security;
revoke all on public.message_details from public,anon,authenticated;
grant select,insert on public.message_details to authenticated;
create policy "read visible message details" on public.message_details for select to authenticated
 using(exists(select 1 from public.visible_private_messages m where m.id=message_id));
create policy "author creates message details" on public.message_details for insert to authenticated
 with check(exists(select 1 from public.visible_private_messages m where m.id=message_id and m.sender_id=(select auth.uid())));
create index message_details_reply_idx on public.message_details(reply_to);
create function private.guard_message_details() returns trigger language plpgsql security invoker set search_path='' as $$
declare room uuid;
begin
 select conversation_id into room from public.messages where id=new.message_id and sender_id=auth.uid() and deleted_at is null;
 if room is null then raise exception 'Message unavailable' using errcode='42501'; end if;
 if new.reply_to is not null and not exists(select 1 from public.visible_private_messages where id=new.reply_to and conversation_id=room) then
   raise exception 'Reply must belong to this conversation' using errcode='42501';
 end if;
 if new.attachment is not null then
   if new.attachment->>'kind' is null or new.attachment->>'kind' not in ('image','video','audio') or new.attachment->>'path' is null
      or split_part(new.attachment->>'path','/',1)<>room::text
      or split_part(new.attachment->>'path','/',2)<>auth.uid()::text
      or not exists(select 1 from storage.objects where bucket_id='chat-media' and name=new.attachment->>'path') then
     raise exception 'Invalid private attachment' using errcode='42501';
   end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_message_details() from public,anon,authenticated;
create trigger guard_message_details before insert on public.message_details for each row execute function private.guard_message_details();

create table public.message_reactions (
 message_id uuid not null references public.messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 emoji text not null check(char_length(emoji) between 1 and 24),
 primary key(message_id,user_id)
);
alter table public.message_reactions enable row level security;
revoke all on public.message_reactions from public,anon,authenticated;
grant select,insert,update,delete on public.message_reactions to authenticated;
create policy "participants see reactions" on public.message_reactions for select to authenticated
 using(exists(select 1 from public.visible_private_messages m where m.id=message_id));
create policy "own participant reactions" on public.message_reactions for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.visible_private_messages m where m.id=message_id));
create policy "update own reaction" on public.message_reactions for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.visible_private_messages m where m.id=message_id));
create policy "remove own reaction" on public.message_reactions for delete to authenticated using(user_id=(select auth.uid()));
create index message_reactions_user_idx on public.message_reactions(user_id);

create table public.message_pins (
 user_id uuid not null references auth.users(id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 primary key(user_id,message_id)
);
alter table public.message_pins enable row level security;
revoke all on public.message_pins from public,anon,authenticated;
grant select,insert,delete on public.message_pins to authenticated;
create policy "own message pins" on public.message_pins for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.visible_private_messages m where m.id=message_id));
create index message_pins_message_idx on public.message_pins(message_id);

create table public.user_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reported_id uuid not null references auth.users(id) on delete cascade,
 message_id uuid references public.messages(id) on delete set null,
 reason text not null check(char_length(reason) between 3 and 1000),
 created_at timestamptz not null default now(), check(reporter_id<>reported_id)
);
alter table public.user_reports enable row level security;
revoke all on public.user_reports from public,anon,authenticated;
grant select,insert on public.user_reports to authenticated;
create policy "own reports" on public.user_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy "submit report" on public.user_reports for insert to authenticated
 with check(reporter_id=(select auth.uid()) and (message_id is null or exists(select 1 from public.visible_private_messages m where m.id=message_id and m.sender_id=reported_id)));
create index user_reports_reporter_idx on public.user_reports(reporter_id);
create index user_reports_reported_idx on public.user_reports(reported_id);
create index user_reports_message_idx on public.user_reports(message_id);

create function public.send_private_message_v2(p_id uuid,p_conversation_id uuid,p_text text,p_reply_to uuid default null,p_forwarded boolean default false,p_attachment jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb; detail public.message_details;
begin
 saved:=public.send_private_message(p_id,p_conversation_id,p_text);
 select * into detail from public.message_details where message_id=p_id;
 if found then
  if row(detail.reply_to,detail.forwarded,detail.attachment) is distinct from row(p_reply_to,p_forwarded,p_attachment) then raise exception 'Retry differs'; end if;
 else
  insert into public.message_details(message_id,reply_to,forwarded,attachment) values(p_id,p_reply_to,p_forwarded,p_attachment);
 end if;
 return saved;
end $$;
revoke all on function public.send_private_message_v2(uuid,uuid,text,uuid,boolean,jsonb) from public,anon;
grant execute on function public.send_private_message_v2(uuid,uuid,text,uuid,boolean,jsonb) to authenticated;

create function public.cancel_unread_private_message(p_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare msg public.messages;
begin
 select * into msg from public.messages where id=p_id for update;
 if msg.sender_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Only author may cancel' using errcode='42501'; end if;
 if msg.deleted_at is not null then return true; end if;
 if msg.read_by_other then raise exception 'El mensaje ya fue leído'; end if;
 perform public.remove_private_messages(msg.conversation_id,array[p_id],true,null);
 return true;
end $$;
revoke all on function public.cancel_unread_private_message(uuid) from public,anon;
grant execute on function public.cancel_unread_private_message(uuid) to authenticated;

create function public.hide_own_private_messages(p_conversation_id uuid,p_before timestamptz) returns integer
language plpgsql security invoker set search_path='' as $$
declare ids uuid[];
begin
 if auth.uid() is null or p_before is null or p_before>clock_timestamp() or not exists(select 1 from public.conversations where id=p_conversation_id) then raise exception 'Invalid selection' using errcode='42501'; end if;
 select array_agg(id) into ids from public.visible_private_messages where conversation_id=p_conversation_id and sender_id=auth.uid() and created_at<=p_before;
 if ids is null then return 0; end if;
 return public.remove_private_messages(p_conversation_id,ids,false,null);
end $$;
revoke all on function public.hide_own_private_messages(uuid,timestamptz) from public,anon;
grant execute on function public.hide_own_private_messages(uuid,timestamptz) to authenticated;
create function public.hide_private_conversation(p_conversation_id uuid) returns integer
language sql security invoker set search_path='' as $$
 select public.remove_private_messages(p_conversation_id,null,false,clock_timestamp());
$$;
revoke all on function public.hide_private_conversation(uuid) from public,anon;
grant execute on function public.hide_private_conversation(uuid) to authenticated;

-- Aggregate existing events; keep every original notification intact.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in ('like','comment','follow','mention','system','message','share','profile_visit'));
create index notifications_group_order_idx on public.notifications(user_id,actor_id,type,created_at desc,id desc);
create view public.grouped_notifications with(security_invoker=true) as
 select latest.*, groups.event_count,groups.unread_count
 from (select user_id,actor_id,type,count(*)::int event_count,count(*) filter(where not read)::int unread_count
 from public.notifications group by user_id,actor_id,type) groups
 cross join lateral (select n.* from public.notifications n where n.user_id=groups.user_id and n.actor_id is not distinct from groups.actor_id and n.type=groups.type order by created_at desc,id desc limit 1) latest;
revoke all on public.grouped_notifications from public,anon,authenticated;
grant select on public.grouped_notifications to authenticated;
create function public.read_notification_group(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare n public.notifications;
begin
 select * into n from public.notifications where id=p_id;
 if not found then return; end if;
 update public.notifications set read=true where user_id=auth.uid() and actor_id is not distinct from n.actor_id and type=n.type and (created_at,id)<=(n.created_at,n.id);
end $$;
revoke all on function public.read_notification_group(uuid) from public,anon;
grant execute on function public.read_notification_group(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('chat-media','chat-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mp4','audio/m4a','audio/mpeg','audio/aac']) on conflict(id) do nothing;
create policy "upload private chat media" on storage.objects for insert to authenticated with check(
 bucket_id='chat-media' and (storage.foldername(name))[2]=(select auth.uid())::text
 and exists(select 1 from public.conversations c where c.id::text=(storage.foldername(name))[1]));
create policy "read private chat media" on storage.objects for select to authenticated using(
 bucket_id='chat-media' and exists(select 1 from public.conversations c where c.id::text=(storage.foldername(name))[1])
 and ((storage.foldername(name))[2]=(select auth.uid())::text or exists(select 1 from public.message_details d join public.visible_private_messages m on m.id=d.message_id where d.attachment->>'path'=name)));
create policy "remove own chat uploads" on storage.objects for delete to authenticated using(bucket_id='chat-media' and (storage.foldername(name))[2]=(select auth.uid())::text);
do $$ declare tbl text; begin
 foreach tbl in array array['message_details','message_reactions','message_pins','chat_preferences'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tbl) then execute format('alter publication supabase_realtime add table public.%I',tbl); end if;
 end loop;
end $$;

create function private.guard_private_call_delivery() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid()<>new.caller_id then raise exception 'Invalid caller' using errcode='42501'; end if;
 if exists(select 1 from public.user_blocks where (user_id=new.caller_id and blocked_id=new.receiver_id) or (user_id=new.receiver_id and blocked_id=new.caller_id)) then
  raise exception 'No se puede contactar a este usuario' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.guard_private_call_delivery() from public,anon,authenticated;
create trigger guard_private_call_delivery before insert on public.calls for each row execute function private.guard_private_call_delivery();

create function public.record_profile_visit(p_other_id uuid,p_event_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare author public.profiles;
begin
 if auth.uid() is null or p_other_id=auth.uid() or p_event_id is null or private.chat_blocked(p_other_id) then return; end if;
 if not exists(select 1 from public.profiles where id=p_other_id) then return; end if;
 select * into author from public.profiles where id=auth.uid();
 insert into public.notifications(id,user_id,actor_id,actor_name,actor_avatar,type,message,data)
 values(p_event_id,p_other_id,auth.uid(),author.username,author.avatar_url,'profile_visit','Visitó tu perfil',jsonb_build_object('profileId',auth.uid())) on conflict(id) do nothing;
end $$;
revoke all on function public.record_profile_visit(uuid,uuid) from public,anon;
grant execute on function public.record_profile_visit(uuid,uuid) to authenticated;
