create table public.chat_groups(id uuid primary key default gen_random_uuid(),name text not null check(char_length(name) between 1 and 60),created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.chat_group_members(group_id uuid not null references public.chat_groups(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,last_read_at timestamptz not null default now(),primary key(group_id,user_id));
create table public.chat_group_messages(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.chat_groups(id) on delete cascade,sender_id uuid not null references auth.users(id),text text not null check(char_length(btrim(text)) between 1 and 1000),created_at timestamptz not null default now());
alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_group_messages enable row level security;
revoke all on public.chat_groups,public.chat_group_members,public.chat_group_messages from public,anon,authenticated;
grant select,insert on public.chat_groups,public.chat_group_members,public.chat_group_messages to authenticated;
grant update(last_read_at) on public.chat_group_members to authenticated;
create policy "group membership is private" on public.chat_group_members for select to authenticated using(user_id=(select auth.uid()));
create policy "creator adds group members" on public.chat_group_members for insert to authenticated with check(exists(select 1 from public.chat_groups g where g.id=group_id and g.created_by=(select auth.uid())));
create policy "read own group receipt" on public.chat_group_members for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "read joined groups" on public.chat_groups for select to authenticated using(created_by=(select auth.uid()) or exists(select 1 from public.chat_group_members m where m.group_id=id and m.user_id=(select auth.uid())));
create policy "create own group" on public.chat_groups for insert to authenticated with check(created_by=(select auth.uid()));
create policy "read joined group messages" on public.chat_group_messages for select to authenticated using(exists(select 1 from public.chat_group_members m where m.group_id=chat_group_messages.group_id and m.user_id=(select auth.uid())));
create policy "send joined group messages" on public.chat_group_messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.chat_group_members m where m.group_id=chat_group_messages.group_id and m.user_id=(select auth.uid())));
create index chat_group_members_user_idx on public.chat_group_members(user_id,group_id);
create index chat_group_messages_order_idx on public.chat_group_messages(group_id,created_at desc,id desc);
create index chat_group_messages_sender_idx on public.chat_group_messages(sender_id);
create index chat_groups_creator_idx on public.chat_groups(created_by);
create function public.create_chat_group(p_id uuid,p_name text,p_members uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare member uuid;
begin
 if auth.uid() is null or char_length(btrim(p_name)) not between 1 and 60 or cardinality(p_members) not between 2 and 32 then raise exception 'Selecciona entre 2 y 32 personas'; end if;
 if not (auth.uid()=any(p_members)) then raise exception 'Missing creator' using errcode='42501'; end if;
 insert into public.chat_groups(id,name,created_by) values(p_id,btrim(p_name),auth.uid()) on conflict(id) do nothing;
 if not exists(select 1 from public.chat_groups where id=p_id and created_by=auth.uid() and name=btrim(p_name)) then raise exception 'Invalid retry' using errcode='42501';end if;
 foreach member in array p_members loop
  if member<>auth.uid() and private.chat_blocked(member) then raise exception 'No se puede añadir a este usuario'; end if;
  insert into public.chat_group_members(group_id,user_id) values(p_id,member) on conflict do nothing;
 end loop;
 return p_id;
end $$;
revoke all on function public.create_chat_group(uuid,text,uuid[]) from public,anon;
grant execute on function public.create_chat_group(uuid,text,uuid[]) to authenticated;
create view public.chat_group_inbox with(security_invoker=true) as
 select g.id,g.name,coalesce(last_message.text,'Grupo creado') last_message,coalesce(last_message.created_at,g.created_at) last_message_at,
 (select count(*)::int from public.chat_group_messages msg where msg.group_id=g.id and msg.sender_id<>(select auth.uid()) and msg.created_at>member.last_read_at) unread_count
 from public.chat_groups g join public.chat_group_members member on member.group_id=g.id and member.user_id=(select auth.uid())
 left join lateral(select text,created_at from public.chat_group_messages msg where msg.group_id=g.id order by created_at desc,id desc limit 1) last_message on true;
revoke all on public.chat_group_inbox from public,anon,authenticated;
grant select on public.chat_group_inbox to authenticated;
alter publication supabase_realtime add table public.chat_group_messages,public.chat_group_members;
