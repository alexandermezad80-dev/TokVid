create or replace function public.live_send_chat_message(p_room_id uuid, p_content text)
returns public.live_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_room_state text;
  v_participation_state text;
  v_message public.live_chat_messages;
  v_content text := btrim(coalesce(p_content, ''));
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_room_id is null then raise exception 'Room id required'; end if;
  if char_length(v_content) < 1 or char_length(v_content) > 1000 then raise exception 'Chat message length must be between 1 and 1000 characters'; end if;

  select state into v_room_state
  from public.live_rooms
  where id = p_room_id;
  if not found then raise exception 'Room not found'; end if;
  if v_room_state <> 'active' then raise exception 'Room is not active'; end if;

  select participation_state into v_participation_state
  from public.live_participants
  where room_id = p_room_id
    and user_id = v_actor
    and participation_state in ('spectator','active')
  limit 1;
  if not found then raise exception 'User is not participating in this Live'; end if;

  if exists (
    select 1 from public.live_blocks
    where room_id = p_room_id and user_id = v_actor and revoked_at is null
  ) then
    raise exception 'User is blocked in this Live';
  end if;

  insert into public.live_chat_messages(room_id, author_id, content)
  values (p_room_id, v_actor, v_content)
  returning * into v_message;

  return v_message;
end;
$$;

create or replace function public.live_moderate_chat_message(p_message_id uuid, p_action text)
returns public.live_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_room_id uuid;
  v_message public.live_chat_messages;
  v_action text := lower(btrim(coalesce(p_action, '')));
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_message_id is null then raise exception 'Message id required'; end if;
  if v_action not in ('hide','delete','restore') then raise exception 'Invalid moderation action'; end if;

  select room_id into v_room_id from public.live_chat_messages where id = p_message_id;
  if not found then raise exception 'Message not found'; end if;

  if not exists (select 1 from public.live_rooms where id = v_room_id and state = 'active') then
    raise exception 'Room is not active';
  end if;
  if not public.live_actor_has_permission(v_room_id, v_actor, 'manage_chat') then
    raise exception 'Chat moderation permission required';
  end if;

  update public.live_chat_messages
  set moderation_state = case v_action when 'hide' then 'hidden' when 'delete' then 'deleted' else 'visible' end,
      updated_at = now()
  where id = p_message_id
  returning * into v_message;

  update public.live_pinned_message
  set unpinned_at = now()
  where message_id = p_message_id and unpinned_at is null
    and v_action in ('hide','delete');

  return v_message;
end;
$$;

create or replace function public.live_pin_chat_message(p_message_id uuid)
returns public.live_pinned_message
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_room_id uuid;
  v_state text;
  v_pinned public.live_pinned_message;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_message_id is null then raise exception 'Message id required'; end if;

  select m.room_id, m.moderation_state into v_room_id, v_state
  from public.live_chat_messages m where m.id = p_message_id;
  if not found then raise exception 'Message not found'; end if;
  if v_state <> 'visible' then raise exception 'Only visible messages can be pinned'; end if;
  if not exists (select 1 from public.live_rooms where id = v_room_id and state = 'active') then raise exception 'Room is not active'; end if;
  if not public.live_actor_has_permission(v_room_id, v_actor, 'manage_chat') then raise exception 'Chat moderation permission required'; end if;

  update public.live_pinned_message set unpinned_at = now() where room_id = v_room_id and unpinned_at is null;
  insert into public.live_pinned_message(room_id, message_id, pinned_by) values (v_room_id, p_message_id, v_actor) returning * into v_pinned;
  return v_pinned;
end;
$$;

create or replace function public.live_unpin_chat_message(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_changed boolean := false;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_room_id is null then raise exception 'Room id required'; end if;
  if not exists (select 1 from public.live_rooms where id = p_room_id and state = 'active') then raise exception 'Room is not active'; end if;
  if not public.live_actor_has_permission(p_room_id, v_actor, 'manage_chat') then raise exception 'Chat moderation permission required'; end if;

  update public.live_pinned_message set unpinned_at = now() where room_id = p_room_id and unpinned_at is null;
  v_changed := found;
  return v_changed;
end;
$$;

revoke all on function public.live_send_chat_message(uuid, text) from public, anon, authenticated;
revoke all on function public.live_moderate_chat_message(uuid, text) from public, anon, authenticated;
revoke all on function public.live_pin_chat_message(uuid) from public, anon, authenticated;
revoke all on function public.live_unpin_chat_message(uuid) from public, anon, authenticated;
grant execute on function public.live_send_chat_message(uuid, text) to authenticated;
grant execute on function public.live_moderate_chat_message(uuid, text) to authenticated;
grant execute on function public.live_pin_chat_message(uuid) to authenticated;
grant execute on function public.live_unpin_chat_message(uuid) to authenticated;
