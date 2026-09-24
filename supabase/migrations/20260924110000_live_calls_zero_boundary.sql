-- Enforce the LIVE <-> private Calls "call zero" boundary.
-- A user participating in active LIVE cannot make, receive, or accept a private Call.
-- A user with a ringing/accepted private Call cannot enter active LIVE.
-- The private Calls system itself remains otherwise unchanged.

create or replace function public.prevent_calls_during_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('ringing', 'accepted')
     and (
       exists (
         select 1
         from public.live_participants lp
         join public.live_rooms lr on lr.id = lp.room_id
         where lp.user_id in (new.caller_id, new.receiver_id)
           and lr.state = 'active'
           and lp.participation_state in ('spectator', 'active')
       )
       or exists (
         select 1
         from public.live_moderators lm
         join public.live_rooms lr on lr.id = lm.room_id
         where lm.user_id in (new.caller_id, new.receiver_id)
           and lm.revoked_at is null
           and lr.state = 'active'
       )
     ) then
    raise exception 'Private Calls are unavailable while a user is participating in an active LIVE'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_calls_during_live() from public;
revoke all on function public.prevent_calls_during_live() from anon;
revoke all on function public.prevent_calls_during_live() from authenticated;

drop trigger if exists calls_blocked_during_live on public.calls;

create trigger calls_blocked_during_live
before insert or update of status, caller_id, receiver_id
on public.calls
for each row
execute function public.prevent_calls_during_live();

create or replace function public.prevent_live_entry_during_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.participation_state in ('spectator', 'active')
     and exists (
       select 1
       from public.live_rooms lr
       where lr.id = new.room_id
         and lr.state = 'active'
     )
     and exists (
       select 1
       from public.calls c
       where c.status in ('ringing', 'accepted')
         and (c.caller_id = new.user_id or c.receiver_id = new.user_id)
     ) then
    raise exception 'Cannot enter LIVE while a private Call is ringing or active'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_live_entry_during_call() from public;
revoke all on function public.prevent_live_entry_during_call() from anon;
revoke all on function public.prevent_live_entry_during_call() from authenticated;

drop trigger if exists live_entry_blocked_during_call on public.live_participants;

create trigger live_entry_blocked_during_call
before insert or update of room_id, user_id, participation_state
on public.live_participants
for each row
execute function public.prevent_live_entry_during_call();
