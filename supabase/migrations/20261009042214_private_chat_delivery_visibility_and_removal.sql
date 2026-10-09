-- Private chat delivery, per-account visibility and author-only removal.
create schema if not exists private;
alter table public.messages add column if not exists deleted_at timestamptz;
create table public.message_hides (
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.message_hides enable row level security;
revoke all on public.message_hides from public, anon, authenticated;
grant select, insert on public.message_hides to authenticated;
create policy "read own hidden messages" on public.message_hides for select to authenticated
  using (user_id = (select auth.uid()));
create policy "hide participant messages" on public.message_hides for insert to authenticated
  with check (user_id = (select auth.uid()) and exists(select 1 from public.messages m where m.id = message_id));
create index message_hides_message_idx on public.message_hides(message_id);
create index if not exists messages_conversation_order_idx on public.messages(conversation_id,created_at desc,id desc);
create index if not exists conversations_user1_idx on public.conversations(user1_id);
create index if not exists conversations_user2_idx on public.conversations(user2_id);

-- Column grants prevent changing participants or moving a message to another chat.
revoke all on public.messages, public.conversations from anon, authenticated;
grant select, insert on public.messages, public.conversations to authenticated;
grant update(read_by_other,text,deleted_at) on public.messages to authenticated;
grant update(last_message,last_message_at) on public.conversations to authenticated;
create policy "sender remove own message content" on public.messages for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));
create or replace function private.guard_private_message_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if row(new.id,new.sender_id,new.conversation_id,new.created_at) is distinct from row(old.id,old.sender_id,old.conversation_id,old.created_at) then
      raise exception 'Message identity cannot change' using errcode='42501';
    end if;
    if auth.uid() = old.sender_id then
      if new.read_by_other is distinct from old.read_by_other or new.text <> '' or new.deleted_at is null then
        raise exception 'Authors may only remove their own message' using errcode='42501';
      end if;
      new.deleted_at := coalesce(old.deleted_at,clock_timestamp());
    elsif new.text is distinct from old.text or new.deleted_at is distinct from old.deleted_at or new.read_by_other is distinct from true then
      raise exception 'Recipients may only mark a message read' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_private_message_update() from public,anon,authenticated;
create trigger guard_private_message_update before update on public.messages
for each row execute function private.guard_private_message_update();

create or replace function private.refresh_private_conversation() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target uuid := coalesce(new.conversation_id,old.conversation_id); latest record;
begin
  select m.text,m.created_at into latest from public.messages m
    where m.conversation_id=target and m.deleted_at is null order by m.created_at desc,m.id desc limit 1;
  update public.conversations set last_message=latest.text,
    last_message_at=coalesce(latest.created_at,created_at) where id=target;
  return coalesce(new,old);
end $$;
revoke all on function private.refresh_private_conversation() from public,anon,authenticated;
create trigger refresh_private_conversation after insert or update or delete on public.messages
for each row execute function private.refresh_private_conversation();

create view public.visible_private_messages with (security_invoker=true) as
 select m.* from public.messages m where m.deleted_at is null
 and not exists(select 1 from public.message_hides h where h.message_id=m.id and h.user_id=(select auth.uid()));
create view public.private_conversation_inbox with (security_invoker=true) as
 select c.id,c.user1_id,c.user2_id,
 case when c.user1_id=(select auth.uid()) then c.user2_id else c.user1_id end other_id,
 p.username other_username,p.avatar_url other_avatar,
 last_visible.text last_message,last_visible.created_at last_message_at,
 (select count(*)::int from public.visible_private_messages unread
   where unread.conversation_id=c.id and unread.sender_id<>(select auth.uid()) and not unread.read_by_other) unread_count
 from public.conversations c
 join lateral (select m.text,m.created_at from public.visible_private_messages m where m.conversation_id=c.id
   order by m.created_at desc,m.id desc limit 1) last_visible on true
 left join public.profiles p on p.id=case when c.user1_id=(select auth.uid()) then c.user2_id else c.user1_id end;
revoke all on public.visible_private_messages,public.private_conversation_inbox from public,anon,authenticated;
grant select on public.visible_private_messages,public.private_conversation_inbox to authenticated;

create function public.private_message_selection(p_conversation_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('before',now(),'total',count(*),'own',count(*) filter(where sender_id=auth.uid()))
 from public.visible_private_messages where conversation_id=p_conversation_id and created_at<=now();
$$;
revoke all on function public.private_message_selection(uuid) from public,anon;
grant execute on function public.private_message_selection(uuid) to authenticated;

create function public.remove_private_messages(p_conversation_id uuid,p_ids uuid[] default null,p_for_all boolean default false,p_before timestamptz default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare targets uuid[]; affected integer;
begin
  if auth.uid() is null or not exists(select 1 from public.conversations where id=p_conversation_id) then
    raise exception 'Private conversation unavailable' using errcode='42501';
  end if;
  if p_before is null and coalesce(cardinality(p_ids),0)=0 then raise exception 'Select messages'; end if;
  if p_before is not null and p_before>clock_timestamp() then raise exception 'Invalid selection time'; end if;
  if p_before is null and exists(select 1 from unnest(p_ids) wanted(id) where not exists(
      select 1 from public.messages m where m.id=wanted.id and m.conversation_id=p_conversation_id)) then
    raise exception 'Selection contains inaccessible messages' using errcode='42501';
  end if;
  select array_agg(id) into targets from public.visible_private_messages
   where conversation_id=p_conversation_id and
    ((p_before is not null and created_at<=p_before) or (p_before is null and id=any(p_ids)));
  if targets is null then return 0; end if;
  if p_for_all then
    if exists(select 1 from public.messages where id=any(targets) and sender_id<>auth.uid()) then
      raise exception 'Only the author can remove a message for everyone' using errcode='42501';
    end if;
    update public.messages set text='',deleted_at=clock_timestamp() where id=any(targets) and sender_id=auth.uid();
  else
    insert into public.message_hides(user_id,message_id) select auth.uid(),id from unnest(targets) t(id)
      on conflict do nothing;
  end if;
  get diagnostics affected=row_count;
  return affected;
end $$;
revoke all on function public.remove_private_messages(uuid,uuid[],boolean,timestamptz) from public,anon;
grant execute on function public.remove_private_messages(uuid,uuid[],boolean,timestamptz) to authenticated;

create function public.open_private_conversation(p_other_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare actor uuid := auth.uid(); found uuid;
begin
 if actor is null or actor=p_other_id or p_other_id is null then raise exception 'Invalid conversation' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(actor,p_other_id)::text||greatest(actor,p_other_id)::text,0));
 select id into found from public.conversations where (user1_id=actor and user2_id=p_other_id) or (user2_id=actor and user1_id=p_other_id)
 order by created_at,id limit 1;
 if found is null then insert into public.conversations(user1_id,user2_id) values(actor,p_other_id) returning id into found; end if;
 return found;
end $$;
revoke all on function public.open_private_conversation(uuid) from public,anon;
grant execute on function public.open_private_conversation(uuid) to authenticated;

-- Realtime checks the SELECT policies for each connected participant.
do $$ declare tbl text; begin
 foreach tbl in array array['messages','conversations','message_hides','follows'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tbl) then
   execute format('alter publication supabase_realtime add table public.%I',tbl);
  end if;
 end loop;
end $$;

create function private.notify_private_message() returns trigger
language plpgsql security invoker set search_path='' as $$
declare recipient uuid; author record;
begin
 select case when c.user1_id=new.sender_id then c.user2_id else c.user1_id end into recipient
 from public.conversations c where c.id=new.conversation_id;
 select username,avatar_url into author from public.profiles where id=new.sender_id;
 insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data)
 values(recipient,new.sender_id,author.username,author.avatar_url,'message','Te envió un mensaje',
 jsonb_build_object('conversationId',new.conversation_id,'messageId',new.id,'otherUserId',new.sender_id,'otherUsername',author.username,'otherAvatar',coalesce(author.avatar_url,'')));
 return new;
end $$;
revoke all on function private.notify_private_message() from public,anon,authenticated;
create trigger notify_private_message after insert on public.messages for each row execute function private.notify_private_message();
