-- Reconcile unanswered calls server-side so ringing calls do not remain open forever.
create extension if not exists pg_cron;

create or replace function public.reconcile_missed_calls()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reconciled_count integer;
begin
  update public.calls
  set
    status = 'missed',
    ended_at = coalesce(ended_at, now())
  where status = 'ringing'
    and created_at < now() - interval '45 seconds';

  get diagnostics reconciled_count = row_count;
  return reconciled_count;
end;
$$;

revoke all on function public.reconcile_missed_calls() from public;
revoke all on function public.reconcile_missed_calls() from anon;
revoke all on function public.reconcile_missed_calls() from authenticated;

select cron.schedule(
  'calls-missed-reconciliation',
  '30 seconds',
  $$select public.reconcile_missed_calls();$$
);
