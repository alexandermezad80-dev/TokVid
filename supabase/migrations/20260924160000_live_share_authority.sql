-- Share Live authority: create an auditable LIVE share reference without moving LIVE participation logic into Messages.

create policy "live_shares_authenticated_insert_own"
on public.live_shares
for insert
to authenticated
with check (
  shared_by = auth.uid()
  and exists (
    select 1
    from public.live_rooms r
    where r.id = live_shares.room_id
      and r.state = 'active'
  )
  and exists (
    select 1
    from public.live_participants p
    where p.room_id = live_shares.room_id
      and p.user_id = auth.uid()
      and p.participation_state in ('spectator', 'active')
  )
);

create or replace function public.live_create_share(
  p_room_id uuid,
  p_recipient_id uuid
)
returns table (
  share_id uuid,
  room_id uuid,
  recipient_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_share_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_recipient_id is null or p_recipient_id = auth.uid() then
    raise exception 'invalid recipient';
  end if;

  if not exists (
    select 1
    from public.live_rooms r
    where r.id = p_room_id
      and r.state = 'active'
  ) then
    raise exception 'live is not active';
  end if;

  if not exists (
    select 1
    from public.live_participants p
    where p.room_id = p_room_id
      and p.user_id = auth.uid()
      and p.participation_state in ('spectator', 'active')
  ) then
    raise exception 'user is not participating in this live';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_recipient_id
  ) then
    raise exception 'recipient not found';
  end if;

  insert into public.live_shares (
    room_id,
    shared_by,
    reference_type,
    reference_id
  )
  values (
    p_room_id,
    auth.uid(),
    'message',
    p_recipient_id
  )
  returning id into v_share_id;

  return query
  select v_share_id, p_room_id, p_recipient_id;
end;
$$;

revoke all on function public.live_create_share(uuid, uuid) from public, anon;
grant execute on function public.live_create_share(uuid, uuid) to authenticated;
