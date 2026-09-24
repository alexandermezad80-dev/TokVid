-- LIVE invitations and join requests: all state-changing operations are server-authoritative.
create or replace function public.live_actor_has_permission(
  p_room_id uuid,
  p_user_id uuid,
  p_permission text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.live_rooms r
    where r.id = p_room_id and r.host_id = p_user_id
  )
  or exists (
    select 1
    from public.live_moderators m
    where m.room_id = p_room_id
      and m.user_id = p_user_id
      and m.revoked_at is null
      and coalesce((m.permissions ->> p_permission)::boolean, false)
  );
$$;

revoke all on function public.live_actor_has_permission(uuid,uuid,text) from public, anon, authenticated;

create or replace function public.live_request_to_join(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_host_id uuid;
  v_mode text;
  v_state text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text, 0));

  select host_id, mode, state
    into v_host_id, v_mode, v_state
  from public.live_rooms
  where id = p_room_id;

  if v_host_id is null then
    raise exception 'LIVE room does not exist' using errcode = '22023';
  end if;
  if v_state <> 'active' then
    raise exception 'LIVE room is not active' using errcode = '22023';
  end if;
  if v_mode <> 'guests' then
    raise exception 'LIVE room does not accept guests' using errcode = '22023';
  end if;
  if v_user_id = v_host_id then
    raise exception 'LIVE host cannot request to join as guest' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = v_user_id
      and participation_state in ('spectator','pending_request','pending_invitation','active')
  ) then
    raise exception 'User already has LIVE membership or pending entry' using errcode = '23505';
  end if;

  insert into public.live_join_requests(room_id, requester_id, state)
  values (p_room_id, v_user_id, 'pending')
  returning id into v_request_id;

  insert into public.live_participants(room_id, user_id, role, participation_state)
  values (p_room_id, v_user_id, 'guest', 'pending_request');

  return v_request_id;
end;
$$;

create or replace function public.live_invite_guest(
  p_room_id uuid,
  p_invitee_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_invitation_id uuid;
  v_host_id uuid;
  v_state text;
  v_mode text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_invitee_id is null then
    raise exception 'Invitee is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text, 0));

  select host_id, mode, state
    into v_host_id, v_mode, v_state
  from public.live_rooms
  where id = p_room_id;

  if v_host_id is null then
    raise exception 'LIVE room does not exist' using errcode = '22023';
  end if;
  if v_state <> 'active' then
    raise exception 'LIVE room is not active' using errcode = '22023';
  end if;
  if v_mode <> 'guests' then
    raise exception 'LIVE room does not accept guests' using errcode = '22023';
  end if;
  if not public.live_actor_has_permission(p_room_id, v_actor_id, 'invite_guests') then
    raise exception 'Actor is not authorized to invite LIVE guests' using errcode = '42501';
  end if;
  if p_invitee_id = v_host_id or p_invitee_id = v_actor_id then
    raise exception 'Invalid LIVE guest invitee' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = p_invitee_id
      and participation_state in ('spectator','pending_request','pending_invitation','active')
  ) then
    raise exception 'User already has LIVE membership or pending entry' using errcode = '23505';
  end if;

  insert into public.live_invitations(room_id, inviter_id, invitee_id, state)
  values (p_room_id, v_actor_id, p_invitee_id, 'pending')
  returning id into v_invitation_id;

  insert into public.live_participants(room_id, user_id, role, participation_state)
  values (p_room_id, p_invitee_id, 'guest', 'pending_invitation');

  return v_invitation_id;
end;
$$;

create or replace function public.live_respond_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_invitee_id uuid;
  v_state text;
  v_participant_id uuid;
  v_slot integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select room_id, invitee_id, state
    into v_room_id, v_invitee_id, v_state
  from public.live_invitations
  where id = p_invitation_id;

  if v_room_id is null then
    raise exception 'LIVE invitation does not exist' using errcode = '22023';
  end if;
  if v_invitee_id <> v_user_id then
    raise exception 'Only the invited user can respond' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_room_id::text, 0));

  select state into v_state
  from public.live_invitations
  where id = p_invitation_id
  for update;

  if v_state <> 'pending' then
    raise exception 'LIVE invitation is no longer pending' using errcode = '22023';
  end if;

  select id into v_participant_id
  from public.live_participants
  where room_id = v_room_id
    and user_id = v_user_id
    and participation_state = 'pending_invitation'
  for update;

  if v_participant_id is null then
    raise exception 'LIVE invitation participant record is missing' using errcode = '22023';
  end if;

  if not p_accept then
    update public.live_invitations
      set state = 'rejected', responded_at = now()
    where id = p_invitation_id;

    update public.live_participants
      set participation_state = 'rejected', left_at = now(), updated_at = now()
    where id = v_participant_id;

    return v_participant_id;
  end if;

  if not exists (
    select 1 from public.live_rooms
    where id = v_room_id and state = 'active' and mode = 'guests'
  ) then
    raise exception 'LIVE room is no longer accepting guests' using errcode = '22023';
  end if;

  select s
    into v_slot
  from generate_series(1, 11) as s
  where not exists (
    select 1 from public.live_participants p
    where p.room_id = v_room_id
      and p.role = 'guest'
      and p.participation_state = 'active'
      and p.window_slot = s
  )
  order by s
  limit 1;

  if v_slot is null then
    raise exception 'LIVE guest capacity is full' using errcode = '54000';
  end if;

  update public.live_invitations
    set state = 'accepted', responded_at = now()
  where id = p_invitation_id;

  update public.live_participants
    set participation_state = 'active',
        window_slot = v_slot,
        joined_at = now(),
        updated_at = now()
  where id = v_participant_id;

  return v_participant_id;
end;
$$;

create or replace function public.live_decide_join_request(
  p_request_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_room_id uuid;
  v_requester_id uuid;
  v_state text;
  v_participant_id uuid;
  v_slot integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select room_id, requester_id, state
    into v_room_id, v_requester_id, v_state
  from public.live_join_requests
  where id = p_request_id;

  if v_room_id is null then
    raise exception 'LIVE join request does not exist' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_room_id::text, 0));

  if not public.live_actor_has_permission(v_room_id, v_actor_id, 'manage_requests') then
    raise exception 'Actor is not authorized to decide LIVE join requests' using errcode = '42501';
  end if;

  select state into v_state
  from public.live_join_requests
  where id = p_request_id
  for update;

  if v_state <> 'pending' then
    raise exception 'LIVE join request is no longer pending' using errcode = '22023';
  end if;

  select id into v_participant_id
  from public.live_participants
  where room_id = v_room_id
    and user_id = v_requester_id
    and participation_state = 'pending_request'
  for update;

  if v_participant_id is null then
    raise exception 'LIVE join request participant record is missing' using errcode = '22023';
  end if;

  if not p_accept then
    update public.live_join_requests
      set state = 'rejected', decided_by = v_actor_id, decided_at = now()
    where id = p_request_id;

    update public.live_participants
      set participation_state = 'rejected', left_at = now(), updated_at = now()
    where id = v_participant_id;

    return v_participant_id;
  end if;

  if not exists (
    select 1 from public.live_rooms
    where id = v_room_id and state = 'active' and mode = 'guests'
  ) then
    raise exception 'LIVE room is no longer accepting guests' using errcode = '22023';
  end if;

  select s
    into v_slot
  from generate_series(1, 11) as s
  where not exists (
    select 1 from public.live_participants p
    where p.room_id = v_room_id
      and p.role = 'guest'
      and p.participation_state = 'active'
      and p.window_slot = s
  )
  order by s
  limit 1;

  if v_slot is null then
    raise exception 'LIVE guest capacity is full' using errcode = '54000';
  end if;

  update public.live_join_requests
    set state = 'accepted', decided_by = v_actor_id, decided_at = now()
  where id = p_request_id;

  update public.live_participants
    set participation_state = 'active',
        window_slot = v_slot,
        joined_at = now(),
        updated_at = now()
  where id = v_participant_id;

  return v_participant_id;
end;
$$;

revoke all on function public.live_request_to_join(uuid) from public, anon, authenticated;
revoke all on function public.live_invite_guest(uuid,uuid) from public, anon, authenticated;
revoke all on function public.live_respond_invitation(uuid,boolean) from public, anon, authenticated;
revoke all on function public.live_decide_join_request(uuid,boolean) from public, anon, authenticated;
grant execute on function public.live_request_to_join(uuid) to authenticated;
grant execute on function public.live_invite_guest(uuid,uuid) to authenticated;
grant execute on function public.live_respond_invitation(uuid,boolean) to authenticated;
grant execute on function public.live_decide_join_request(uuid,boolean) to authenticated;