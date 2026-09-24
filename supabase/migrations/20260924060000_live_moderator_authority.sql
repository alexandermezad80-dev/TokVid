-- LIVE moderator authority. Host is always authoritative; moderators only receive explicit permissions.
create unique index if not exists live_moderators_one_active_user
  on public.live_moderators(room_id, user_id)
  where revoked_at is null;

create or replace function public.live_grant_moderator(
  p_room_id uuid,
  p_user_id uuid,
  p_permissions jsonb default '{}'::jsonb
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
  v_id uuid;
  v_permissions jsonb;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_user_id is null then raise exception 'Moderator user is required' using errcode='22023'; end if;
  if jsonb_typeof(p_permissions) <> 'object' then raise exception 'Moderator permissions must be an object' using errcode='22023'; end if;

  select host_id,state into v_host,v_state from public.live_rooms where id=p_room_id;
  if v_host is null then raise exception 'LIVE room does not exist' using errcode='22023'; end if;
  if v_state <> 'active' then raise exception 'LIVE room is not active' using errcode='22023'; end if;
  if v_actor <> v_host then raise exception 'Only the LIVE host can designate moderators' using errcode='42501'; end if;
  if p_user_id = v_host then raise exception 'LIVE host is not a moderator' using errcode='22023'; end if;

  if not exists (
    select 1 from public.live_participants
    where room_id=p_room_id and user_id=p_user_id
      and participation_state in ('spectator','active')
  ) then
    raise exception 'Moderator must be present in the LIVE' using errcode='22023';
  end if;

  v_permissions := jsonb_build_object(
    'invite_guests', coalesce((p_permissions->>'invite_guests')::boolean,false),
    'manage_requests', coalesce((p_permissions->>'manage_requests')::boolean,false),
    'manage_participants', coalesce((p_permissions->>'manage_participants')::boolean,false),
    'manage_chat', coalesce((p_permissions->>'manage_chat')::boolean,false),
    'remove_users', coalesce((p_permissions->>'remove_users')::boolean,false),
    'mute_users', coalesce((p_permissions->>'mute_users')::boolean,false),
    'block_users', coalesce((p_permissions->>'block_users')::boolean,false)
  );

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));

  update public.live_moderators
     set permissions=v_permissions, granted_by=v_actor, revoked_at=null
   where room_id=p_room_id and user_id=p_user_id
     and revoked_at is not null
   returning id into v_id;

  if v_id is null then
    insert into public.live_moderators(room_id,user_id,permissions,granted_by)
    values(p_room_id,p_user_id,v_permissions,v_actor)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.live_revoke_moderator(
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
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select host_id,state into v_host,v_state from public.live_rooms where id=p_room_id;
  if v_host is null then raise exception 'LIVE room does not exist' using errcode='22023'; end if;
  if v_state <> 'active' then raise exception 'LIVE room is not active' using errcode='22023'; end if;
  if v_actor <> v_host then raise exception 'Only the LIVE host can revoke moderators' using errcode='42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));

  update public.live_moderators
     set revoked_at=now()
   where room_id=p_room_id and user_id=p_user_id and revoked_at is null;

  return found;
end;
$$;

create or replace function public.live_update_moderator_permissions(
  p_room_id uuid,
  p_user_id uuid,
  p_permissions jsonb
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
  v_id uuid;
  v_permissions jsonb;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_permissions) <> 'object' then raise exception 'Moderator permissions must be an object' using errcode='22023'; end if;
  select host_id,state into v_host,v_state from public.live_rooms where id=p_room_id;
  if v_host is null then raise exception 'LIVE room does not exist' using errcode='22023'; end if;
  if v_state <> 'active' then raise exception 'LIVE room is not active' using errcode='22023'; end if;
  if v_actor <> v_host then raise exception 'Only the LIVE host can change moderator permissions' using errcode='42501'; end if;
  if p_user_id=v_host then raise exception 'LIVE host is not a moderator' using errcode='22023'; end if;

  v_permissions := jsonb_build_object(
    'invite_guests', coalesce((p_permissions->>'invite_guests')::boolean,false),
    'manage_requests', coalesce((p_permissions->>'manage_requests')::boolean,false),
    'manage_participants', coalesce((p_permissions->>'manage_participants')::boolean,false),
    'manage_chat', coalesce((p_permissions->>'manage_chat')::boolean,false),
    'remove_users', coalesce((p_permissions->>'remove_users')::boolean,false),
    'mute_users', coalesce((p_permissions->>'mute_users')::boolean,false),
    'block_users', coalesce((p_permissions->>'block_users')::boolean,false)
  );

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,0));

  update public.live_moderators
     set permissions=v_permissions
   where room_id=p_room_id and user_id=p_user_id and revoked_at is null
   returning id into v_id;

  if v_id is null then raise exception 'Active LIVE moderator not found' using errcode='22023'; end if;
  return v_id;
end;
$$;

revoke all on function public.live_grant_moderator(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.live_revoke_moderator(uuid,uuid) from public,anon,authenticated;
revoke all on function public.live_update_moderator_permissions(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.live_grant_moderator(uuid,uuid,jsonb) to authenticated;
grant execute on function public.live_revoke_moderator(uuid,uuid) to authenticated;
grant execute on function public.live_update_moderator_permissions(uuid,uuid,jsonb) to authenticated;