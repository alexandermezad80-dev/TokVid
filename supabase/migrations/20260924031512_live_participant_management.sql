-- LIVE participant management: voluntary exit, removal, blocking and moderation mute.
create table if not exists public.live_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint live_blocks_revoked_at_check check (revoked_at is null or revoked_at >= created_at)
);

alter table public.live_blocks enable row level security;

create unique index if not exists live_blocks_one_active_user
  on public.live_blocks(room_id,user_id)
  where revoked_at is null;

create index if not exists live_blocks_room_id_idx
  on public.live_blocks(room_id);

create index if not exists live_blocks_user_id_idx
  on public.live_blocks(user_id);

alter table public.live_participants
  add column if not exists mic_moderation_blocked boolean not null default false;

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
         left_at=now(),
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

create or replace function public.live_remove_participant(
  p_room_id uuid,
  p_user_id uuid
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
  v_role text;
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
  if p_user_id=v_host then
    raise exception 'LIVE host cannot be removed as a participant' using errcode='42501';
  end if;
  if not public.live_actor_has_permission(p_room_id,v_actor,'remove_users') then
    raise exception 'Actor is not authorized to remove LIVE participants' using errcode='42501';
  end if;

  select id,role into v_participant_id,v_role
  from public.live_participants
  where room_id=p_room_id
    and user_id=p_user_id
    and participation_state in ('spectator','active','pending_request','pending_invitation')
  for update;

  if v_participant_id is null then
    raise exception 'LIVE participant not found' using errcode='22023';
  end if;
  if v_role='host' then
    raise exception 'LIVE host cannot be removed as a participant' using errcode='42501';
  end if;

  update public.live_participants
     set participation_state='removed',
         window_slot=null,
         left_at=now(),
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

create or replace function public.live_block_user(
  p_room_id uuid,
  p_user_id uuid
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
  v_block_id uuid;
  v_participant_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_user_id is null then
    raise exception 'Blocked user is required' using errcode='22023';
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
  if p_user_id=v_host then
    raise exception 'LIVE host cannot be blocked' using errcode='42501';
  end if;
  if not public.live_actor_has_permission(p_room_id,v_actor,'block_users') then
    raise exception 'Actor is not authorized to block LIVE users' using errcode='42501';
  end if;

  update public.live_blocks
     set revoked_at=null, blocked_by=v_actor, created_at=now()
   where room_id=p_room_id and user_id=p_user_id and revoked_at is not null
   returning id into v_block_id;

  if v_block_id is null then
    insert into public.live_blocks(room_id,user_id,blocked_by)
    values(p_room_id,p_user_id,v_actor)
    on conflict (room_id,user_id) where revoked_at is null do nothing
    returning id into v_block_id;
  end if;

  update public.live_join_requests
     set state='rejected',decided_by=v_actor,decided_at=now()
   where room_id=p_room_id and requester_id=p_user_id and state='pending';

  update public.live_invitations
     set state='rejected',responded_at=now()
   where room_id=p_room_id and invitee_id=p_user_id and state='pending';

  select id into v_participant_id
  from public.live_participants
  where room_id=p_room_id
    and user_id=p_user_id
    and participation_state in ('spectator','pending_request','pending_invitation','active')
  for update;

  if v_participant_id is not null then
    update public.live_participants
       set participation_state='removed',
           window_slot=null,
           left_at=now(),
           updated_at=now()
     where id=v_participant_id;
  end if;

  return v_block_id;
end;
$$;

create or replace function public.live_unblock_user(
  p_room_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_host uuid;
  v_state text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
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
  if not public.live_actor_has_permission(p_room_id,v_actor,'block_users') then
    raise exception 'Actor is not authorized to unblock LIVE users' using errcode='42501';
  end if;

  update public.live_blocks
     set revoked_at=now()
   where room_id=p_room_id and user_id=p_user_id and revoked_at is null;

  return found;
end;
$$;

create or replace function public.live_mute_participant(
  p_room_id uuid,
  p_user_id uuid
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
  v_role text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
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
  if p_user_id=v_host then
    raise exception 'Use host controls for the LIVE host' using errcode='22023';
  end if;
  if not public.live_actor_has_permission(p_room_id,v_actor,'mute_users') then
    raise exception 'Actor is not authorized to mute LIVE participants' using errcode='42501';
  end if;

  select id,role into v_participant_id,v_role
  from public.live_participants
  where room_id=p_room_id and user_id=p_user_id and participation_state='active'
  for update;

  if v_participant_id is null or v_role<>'guest' then
    raise exception 'Active LIVE guest not found' using errcode='22023';
  end if;

  update public.live_participants
     set mic_moderation_blocked=true,
         mic_state='off',
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

create or replace function public.live_unmute_participant(
  p_room_id uuid,
  p_user_id uuid
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
  v_role text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
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
  if p_user_id=v_host then
    raise exception 'Use host controls for the LIVE host' using errcode='22023';
  end if;
  if not public.live_actor_has_permission(p_room_id,v_actor,'mute_users') then
    raise exception 'Actor is not authorized to unmute LIVE participants' using errcode='42501';
  end if;

  select id,role into v_participant_id,v_role
  from public.live_participants
  where room_id=p_room_id and user_id=p_user_id and participation_state='active'
  for update;

  if v_participant_id is null or v_role<>'guest' then
    raise exception 'Active LIVE guest not found' using errcode='22023';
  end if;

  update public.live_participants
     set mic_moderation_blocked=false,
         updated_at=now()
   where id=v_participant_id;

  return v_participant_id;
end;
$$;

-- New blocked-user guard for all entry/acceptance paths.
create or replace function public.live_blocked_user(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.live_blocks
    where room_id=p_room_id and user_id=p_user_id and revoked_at is null
  );
$$;

revoke all on function public.live_blocked_user(uuid,uuid) from public,anon,authenticated;

-- Keep existing entry functions server-authoritative and reject active Live blocks.
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
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));
  select host_id,mode,state into v_host_id,v_mode,v_state from public.live_rooms where id=p_room_id;
  if v_host_id is null then raise exception 'LIVE room does not exist' using errcode='22023'; end if;
  if v_state <> 'active' then raise exception 'LIVE room is not active' using errcode='22023'; end if;
  if v_mode <> 'guests' then raise exception 'LIVE room does not accept guests' using errcode='22023'; end if;
  if v_user_id=v_host_id then raise exception 'LIVE host cannot request to join as guest' using errcode='22023'; end if;
  if public.live_blocked_user(p_room_id,v_user_id) then raise exception 'User is blocked from this LIVE' using errcode='42501'; end if;
  if exists (select 1 from public.live_participants where room_id=p_room_id and user_id=v_user_id and participation_state in ('spectator','pending_request','pending_invitation','active')) then
    raise exception 'User already has LIVE membership or pending entry' using errcode='23505';
  end if;
  insert into public.live_join_requests(room_id,requester_id,state) values(p_room_id,v_user_id,'pending') returning id into v_request_id;
  insert into public.live_participants(room_id,user_id,role,participation_state) values(p_room_id,v_user_id,'guest','pending_request');
  return v_request_id;
end;
$$;

create or replace function public.live_invite_guest(p_room_id uuid,p_invitee_id uuid)
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
  if v_actor_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_invitee_id is null then raise exception 'Invitee is required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));
  select host_id,mode,state into v_host_id,v_mode,v_state from public.live_rooms where id=p_room_id;
  if v_host_id is null then raise exception 'LIVE room does not exist' using errcode='22023'; end if;
  if v_state <> 'active' then raise exception 'LIVE room is not active' using errcode='22023'; end if;
  if v_mode <> 'guests' then raise exception 'LIVE room does not accept guests' using errcode='22023'; end if;
  if not public.live_actor_has_permission(p_room_id,v_actor_id,'invite_guests') then raise exception 'Actor is not authorized to invite LIVE guests' using errcode='42501'; end if;
  if p_invitee_id=v_host_id or p_invitee_id=v_actor_id then raise exception 'Invalid LIVE guest invitee' using errcode='22023'; end if;
  if public.live_blocked_user(p_room_id,p_invitee_id) then raise exception 'User is blocked from this LIVE' using errcode='42501'; end if;
  if exists (select 1 from public.live_participants where room_id=p_room_id and user_id=p_invitee_id and participation_state in ('spectator','pending_request','pending_invitation','active')) then
    raise exception 'User already has LIVE membership or pending entry' using errcode='23505';
  end if;
  insert into public.live_invitations(room_id,inviter_id,invitee_id,state) values(p_room_id,v_actor_id,p_invitee_id,'pending') returning id into v_invitation_id;
  insert into public.live_participants(room_id,user_id,role,participation_state) values(p_room_id,p_invitee_id,'guest','pending_invitation');
  return v_invitation_id;
end;
$$;

revoke all on function public.live_leave(uuid) from public,anon,authenticated;
revoke all on function public.live_remove_participant(uuid,uuid) from public,anon,authenticated;
revoke all on function public.live_block_user(uuid,uuid) from public,anon,authenticated;
revoke all on function public.live_unblock_user(uuid,uuid) from public,anon,authenticated;
revoke all on function public.live_mute_participant(uuid,uuid) from public,anon,authenticated;
revoke all on function public.live_unmute_participant(uuid,uuid) from public,anon,authenticated;
grant execute on function public.live_leave(uuid) to authenticated;
grant execute on function public.live_remove_participant(uuid,uuid) to authenticated;
grant execute on function public.live_block_user(uuid,uuid) to authenticated;
grant execute on function public.live_unblock_user(uuid,uuid) to authenticated;
grant execute on function public.live_mute_participant(uuid,uuid) to authenticated;
grant execute on function public.live_unmute_participant(uuid,uuid) to authenticated;
