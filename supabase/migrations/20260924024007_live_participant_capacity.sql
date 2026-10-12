-- Enforce LIVE participant roles, audiovisual slots, and the 1 Host + 11 Guests capacity atomically.
create or replace function public.validate_live_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_host uuid;
  room_mode text;
  active_host_count integer;
  active_guest_count integer;
begin
  if tg_op = 'UPDATE'
     and new.room_id = old.room_id
     and new.user_id = old.user_id
     and new.role = old.role
     and new.participation_state = old.participation_state
     and new.window_slot is not distinct from old.window_slot then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.room_id::text, 0));

  select r.host_id, r.mode
    into room_host, room_mode
  from public.live_rooms r
  where r.id = new.room_id;

  if room_host is null then
    raise exception 'LIVE room does not exist'
      using errcode = '22023';
  end if;

  if new.participation_state in ('spectator','pending_request','pending_invitation','active')
     and exists (
       select 1 from public.live_rooms r
       where r.id = new.room_id and r.state <> 'active'
     ) then
    raise exception 'LIVE room is not active'
      using errcode = '22023';
  end if;

  if new.role = 'host' then
    if new.user_id <> room_host then
      raise exception 'LIVE host participant must match room host'
        using errcode = '22023';
    end if;

    if new.participation_state = 'active' and new.window_slot is distinct from 0 then
      raise exception 'LIVE host must occupy window slot 0'
        using errcode = '22023';
    end if;
  elsif new.role = 'guest' then
    if new.participation_state = 'active' then
      if room_mode <> 'guests' then
        raise exception 'LIVE room does not accept guests'
          using errcode = '22023';
      end if;

      if new.window_slot is null or new.window_slot not between 1 and 11 then
        raise exception 'LIVE guest must occupy a window slot from 1 to 11'
          using errcode = '22023';
      end if;
    elsif new.window_slot is not null then
      raise exception 'Non-active LIVE guest cannot occupy a window slot'
        using errcode = '22023';
    end if;
  elsif new.role = 'spectator' then
    if new.window_slot is not null then
      raise exception 'LIVE spectator cannot occupy an audiovisual window'
        using errcode = '22023';
    end if;
  end if;

  if new.participation_state = 'active' and new.role = 'host' then
    select count(*)
      into active_host_count
    from public.live_participants p
    where p.room_id = new.room_id
      and p.role = 'host'
      and p.participation_state = 'active'
      and (tg_op <> 'UPDATE' or p.id <> new.id);

    if active_host_count >= 1 then
      raise exception 'LIVE room can have only one active host'
        using errcode = '22023';
    end if;
  end if;

  if new.participation_state = 'active' and new.role = 'guest' then
    select count(*)
      into active_guest_count
    from public.live_participants p
    where p.room_id = new.room_id
      and p.role = 'guest'
      and p.participation_state = 'active'
      and (tg_op <> 'UPDATE' or p.id <> new.id);

    if active_guest_count >= 11 then
      raise exception 'LIVE room cannot have more than 11 active guests'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_live_participant() from public;
revoke all on function public.validate_live_participant() from anon;
revoke all on function public.validate_live_participant() from authenticated;

drop trigger if exists live_participants_validate on public.live_participants;

create trigger live_participants_validate
before insert or update of room_id, user_id, role, participation_state, window_slot
on public.live_participants
for each row
execute function public.validate_live_participant();
