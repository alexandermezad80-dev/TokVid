-- LIVE room lifecycle: Host-controlled, one-way active -> finished transition.

create or replace function public.live_finish_room(p_room_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_host_id uuid;
  v_state text;
  v_finished_at timestamptz := now();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if p_room_id is null then
    raise exception 'LIVE room is required' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));

  select host_id, state
    into v_host_id, v_state
  from public.live_rooms
  where id = p_room_id
  for update;

  if v_host_id is null then
    raise exception 'LIVE room does not exist' using errcode='22023';
  end if;

  if v_host_id <> v_actor_id then
    raise exception 'Only the LIVE host can finish the room' using errcode='42501';
  end if;

  if v_state <> 'active' then
    raise exception 'LIVE room is already finished' using errcode='22023';
  end if;

  -- The room transition is authoritative and irreversible.
  update public.live_rooms
     set state = 'finished',
         finished_at = v_finished_at
   where id = p_room_id
     and state = 'active';

  if not found then
    raise exception 'LIVE room could not be finished' using errcode='40001';
  end if;

  -- Close every open membership. Historical terminal states remain distinct
  -- from voluntary exit, removal, or rejection.
  update public.live_participants
     set participation_state = 'finished',
         window_slot = null,
         left_at = coalesce(left_at, v_finished_at),
         updated_at = v_finished_at
   where room_id = p_room_id
     and participation_state in (
       'spectator',
       'pending_request',
       'pending_invitation',
       'active'
     );

  -- A finished room cannot leave pending entry decisions actionable.
  update public.live_join_requests
     set state = 'rejected',
         decided_by = v_actor_id,
         decided_at = v_finished_at
   where room_id = p_room_id
     and state = 'pending';

  update public.live_invitations
     set state = 'rejected',
         responded_at = v_finished_at
   where room_id = p_room_id
     and state = 'pending';

  -- Moderation authority ends with the room.
  update public.live_moderators
     set revoked_at = coalesce(revoked_at, v_finished_at)
   where room_id = p_room_id
     and revoked_at is null;

  -- No active pinned message survives room closure.
  update public.live_pinned_message
     set unpinned_at = coalesce(unpinned_at, v_finished_at)
   where room_id = p_room_id
     and unpinned_at is null;

  return v_finished_at;
end;
$$;

revoke all on function public.live_finish_room(uuid) from public, anon, authenticated;
grant execute on function public.live_finish_room(uuid) to authenticated;
