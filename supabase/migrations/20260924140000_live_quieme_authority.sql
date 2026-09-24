-- LIVE Quiéreme authority.
-- One user can give Quiéreme once per LIVE. The operation is idempotent.
-- If the user does not already follow the Host, the same action creates that Follow.

alter table public.live_quieme
  add constraint live_quieme_room_user_unique unique (room_id, user_id);

create or replace function public.live_give_quieme(
  p_room_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_state text;
  v_participation_state text;
  v_quieme_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if p_room_id is null then
    raise exception 'Room id required' using errcode='22023';
  end if;

  select host_id, state
    into v_host_id, v_state
  from public.live_rooms
  where id = p_room_id;

  if v_host_id is null then
    raise exception 'LIVE room does not exist' using errcode='22023';
  end if;

  if v_state <> 'active' then
    raise exception 'LIVE room is not active' using errcode='22023';
  end if;

  if v_user_id = v_host_id then
    raise exception 'LIVE host cannot give Quiéreme to self' using errcode='22023';
  end if;

  select participation_state
    into v_participation_state
  from public.live_participants
  where room_id = p_room_id
    and user_id = v_user_id
    and participation_state in ('spectator', 'active')
  limit 1;

  if v_participation_state is null then
    raise exception 'User is not participating in this LIVE' using errcode='42501';
  end if;

  if public.live_blocked_user(p_room_id, v_user_id) then
    raise exception 'User is blocked in this LIVE' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text, 0));

  insert into public.live_quieme(room_id, user_id, host_id)
  values (p_room_id, v_user_id, v_host_id)
  on conflict (room_id, user_id) do nothing
  returning id into v_quieme_id;

  if v_quieme_id is null then
    select id
      into v_quieme_id
    from public.live_quieme
    where room_id = p_room_id
      and user_id = v_user_id;
  end if;

  insert into public.follows(follower_id, following_id)
  values (v_user_id, v_host_id)
  on conflict (follower_id, following_id) do nothing;

  return v_quieme_id;
end;
$$;

revoke all on function public.live_give_quieme(uuid) from public, anon, authenticated;
grant execute on function public.live_give_quieme(uuid) to authenticated;
