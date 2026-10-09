-- Create an in-app notification when an unanswered call is reconciled as missed.
create or replace function public.notify_missed_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'missed' and new.status = 'missed' then
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      message,
      data
    )
    values (
      new.receiver_id,
      new.caller_id,
      'system',
      'Llamada perdida',
      jsonb_build_object(
        'type', 'missed_call',
        'callId', new.id,
        'callType', new.type,
        'conversationId', new.conversation_id
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_missed_call() from public;
revoke all on function public.notify_missed_call() from anon;
revoke all on function public.notify_missed_call() from authenticated;

drop trigger if exists calls_notify_missed_call on public.calls;

create trigger calls_notify_missed_call
after update of status on public.calls
for each row
when (new.status = 'missed' and old.status is distinct from 'missed')
execute function public.notify_missed_call();
