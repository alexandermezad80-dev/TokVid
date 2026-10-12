-- Keep LIVE audiovisual participation isolated from private Calls.
-- A user actively participating in LIVE cannot create or accept a private call.
-- Existing Calls are otherwise left untouched.

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
         where lp.user_id = new.caller_id
           and lr.state = 'active'
           and lp.participation_state in ('spectator', 'active', 'pending_request', 'pending_invitation')
       )
       or exists (
         select 1
         from public.live_participants lp
         join public.live_rooms lr on lr.id = lp.room_id
         where lp.user_id = new.receiver_id
           and lr.state = 'active'
           and lp.participation_state in ('spectator', 'active', 'pending_request', 'pending_invitation')
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
before insert or update of status, caller_id, receiver_id on public.calls
for each row
execute function public.prevent_calls_during_live();
