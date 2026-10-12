-- LIVE camera/microphone authority.
-- The server controls whether a participant is authorized to use a device.
-- The participant alone controls the actual device state; no function can turn
-- another user's camera or microphone on.

create or replace function public.live_set_device_authorization(
  p_room_id uuid,
  p_user_id uuid,
  p_camera_authorized boolean,
  p_mic_authorized boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_host uuid;
  v_state text;
  v_participant_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_user_id is null then
    raise exception 'Participant user is required' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));

  select host_id,state into v_host,v_state
  from public.live_rooms
  where id=p_room_id;

  if v_host is null then
    raise exception 'LIVE room does not exist' using errcode='22023';
  end if;
  if v_state <> 'active' then
    raise exception 'LIVE room is not active' using errcode='22023';
  end if;

  if v_actor <> v_host
     and not public.live_actor_has_permission(p_room_id,v_actor,'manage_participants') then
    raise exception 'Actor is not authorized to manage LIVE device permissions' using errcode='42501';
  end if;

  select id into v_participant_id
  from public.live_participants
  where room_id=p_room_id
    and user_id=p_user_id
    and role='guest'
    and participation_state='active'
  for update;

  if v_participant_id is null then
    raise exception 'Active LIVE guest not found' using errcode='22023';
  end if;

  update public.live_participants
     set camera_authorized=p_camera_authorized,
         mic_authorized=p_mic_authorized,
         camera_state=case when p_camera_authorized then camera_state else 'off' end,
         mic_state=case
           when p_mic_authorized and not mic_moderation_blocked then mic_state
           else 'off'
         end,
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

create or replace function public.live_set_camera_state(
  p_room_id uuid,
  p_camera_state text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_camera_state not in ('on','off') then
    raise exception 'Invalid camera state' using errcode='22023';
  end if;

  select id into v_participant_id
  from public.live_participants
  where room_id=p_room_id
    and user_id=v_user_id
    and participation_state in ('spectator','active')
  for update;

  if v_participant_id is null then
    raise exception 'Active LIVE membership not found' using errcode='22023';
  end if;

  if p_camera_state='on' then
    if not exists (
      select 1 from public.live_participants
      where id=v_participant_id
        and role in ('host','guest')
        and camera_authorized=true
    ) then
      raise exception 'Camera is not authorized for this LIVE participant' using errcode='42501';
    end if;
  end if;

  update public.live_participants
     set camera_state=p_camera_state,
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

create or replace function public.live_set_mic_state(
  p_room_id uuid,
  p_mic_state text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_mic_state not in ('on','off') then
    raise exception 'Invalid microphone state' using errcode='22023';
  end if;

  select id into v_participant_id
  from public.live_participants
  where room_id=p_room_id
    and user_id=v_user_id
    and participation_state in ('spectator','active')
  for update;

  if v_participant_id is null then
    raise exception 'Active LIVE membership not found' using errcode='22023';
  end if;

  if p_mic_state='on' then
    if not exists (
      select 1 from public.live_participants
      where id=v_participant_id
        and role in ('host','guest')
        and mic_authorized=true
        and mic_moderation_blocked=false
    ) then
      raise exception 'Microphone is not authorized for this LIVE participant' using errcode='42501';
    end if;
  end if;

  update public.live_participants
     set mic_state=p_mic_state,
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

-- A participant leaving LIVE must not retain active device state.
create or replace function public.live_leave(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant_id uuid;
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));

  select id,role into v_participant_id,v_role
  from public.live_participants
  where room_id=p_room_id
    and user_id=v_user_id
    and participation_state in ('spectator','pending_request','pending_invitation','active')
  for update;

  if v_participant_id is null then
    raise exception 'Active LIVE membership not found' using errcode='22023';
  end if;

  if v_role='host' then
    raise exception 'LIVE host must finish the room instead of leaving as a participant' using errcode='22023';
  end if;

  update public.live_participants
     set participation_state='voluntary_exit',
         window_slot=null,
         camera_authorized=false,
         mic_authorized=false,
         camera_state='off',
         mic_state='off',
         left_at=now(),
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

revoke all on function public.live_set_device_authorization(uuid,uuid,boolean,boolean) from public,anon,authenticated;
revoke all on function public.live_set_camera_state(uuid,text) from public,anon,authenticated;
revoke all on function public.live_set_mic_state(uuid,text) from public,anon,authenticated;
grant execute on function public.live_set_device_authorization(uuid,uuid,boolean,boolean) to authenticated;
grant execute on function public.live_set_camera_state(uuid,text) to authenticated;
grant execute on function public.live_set_mic_state(uuid,text) to authenticated;
