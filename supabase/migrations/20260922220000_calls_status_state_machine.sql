-- Enforce the Calls state machine at the database boundary as defense in depth.
create or replace function public.validate_call_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'ringing' and new.status in ('accepted', 'rejected', 'cancelled', 'missed') then
    return new;
  end if;

  if old.status = 'accepted' and new.status = 'ended' then
    return new;
  end if;

  raise exception 'Invalid call status transition: % -> %', old.status, new.status
    using errcode = '22023';
end;
$$;

revoke all on function public.validate_call_status_transition() from public;
revoke all on function public.validate_call_status_transition() from anon;
revoke all on function public.validate_call_status_transition() from authenticated;

drop trigger if exists calls_validate_status_transition on public.calls;

create trigger calls_validate_status_transition
before update of status on public.calls
for each row
execute function public.validate_call_status_transition();
