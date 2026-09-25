create or replace function public.live_send_gift(
  p_room_id uuid,
  p_recipient_id uuid,
  p_gift_type text,
  p_quantity integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gift_id uuid;
  sender uuid := auth.uid();
begin
  if sender is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then raise exception 'Invalid quantity'; end if;
  if p_gift_type is null or p_gift_type not in ('rose','heart','star','fire','crown') then raise exception 'Invalid gift type'; end if;

  if not exists (
    select 1 from public.live_rooms
    where id = p_room_id and state = 'active'
  ) then raise exception 'LIVE is not active'; end if;

  if not exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = sender
      and participation_state in ('active','spectator')
  ) then raise exception 'Sender is not participating in this LIVE'; end if;

  if not exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = p_recipient_id
      and participation_state = 'active'
  ) then raise exception 'Recipient is not active in this LIVE'; end if;

  insert into public.live_gifts(
    room_id, sender_id, recipient_id, gift_type, quantity, financial_reference
  ) values (
    p_room_id, sender, p_recipient_id, p_gift_type, p_quantity, null
  )
  returning id into gift_id;

  return gift_id;
end;
$$;

revoke all on function public.live_send_gift(uuid, uuid, text, integer) from public, anon;
grant execute on function public.live_send_gift(uuid, uuid, text, integer) to authenticated;

create policy "live_gifts_authenticated_insert_own"
on public.live_gifts
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.live_rooms r
    where r.id = room_id and r.state = 'active'
  )
);