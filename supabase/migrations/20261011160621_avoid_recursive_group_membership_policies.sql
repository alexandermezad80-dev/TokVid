-- Bind membership insertion to the immutable creator through a composite FK.
-- This removes a policy dependency cycle without widening group visibility.
alter table public.chat_groups add constraint chat_groups_id_creator_unique unique(id,created_by);
alter table public.chat_group_members add column creator_id uuid;
update public.chat_group_members m set creator_id=g.created_by from public.chat_groups g where g.id=m.group_id;
alter table public.chat_group_members alter column creator_id set not null;
alter table public.chat_group_members add constraint chat_group_members_owner_fk foreign key(group_id,creator_id) references public.chat_groups(id,created_by) on delete cascade;
drop policy "creator adds group members" on public.chat_group_members;
create policy "creator adds group members" on public.chat_group_members for insert to authenticated with check(creator_id=(select auth.uid()));
create or replace function public.create_chat_group(p_id uuid,p_name text,p_members uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare member uuid;
begin
 if auth.uid() is null or char_length(btrim(p_name)) not between 1 and 60 or cardinality(p_members) not between 2 and 32 then raise exception 'Selecciona entre 2 y 32 personas'; end if;
 if not (auth.uid()=any(p_members)) then raise exception 'Missing creator' using errcode='42501'; end if;
 insert into public.chat_groups(id,name,created_by) values(p_id,btrim(p_name),auth.uid()) on conflict(id) do nothing;
 if not exists(select 1 from public.chat_groups where id=p_id and created_by=auth.uid() and name=btrim(p_name)) then raise exception 'Invalid retry' using errcode='42501';end if;
 foreach member in array p_members loop
  if member<>auth.uid() and private.chat_blocked(member) then raise exception 'No se puede añadir a este usuario'; end if;
  insert into public.chat_group_members(group_id,user_id,creator_id) values(p_id,member,auth.uid()) on conflict do nothing;
 end loop;
 return p_id;
end $$;
