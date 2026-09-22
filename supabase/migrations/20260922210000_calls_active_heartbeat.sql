-- Track active-call participants so abandoned accepted calls can be reconciled safely.
alter table public.calls
  add column if not exists caller_heartbeat_at timestamptz,
  add column if not exists receiver_heartbeat_at timestamptz;

create or replace function public.reconcile_stale_calls()
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
    status = 'ended',
    ended_at = coalesce(ended_at, now())
  where status = 'accepted'
    and greatest(
      coalesce(caller_heartbeat_at, answered_at, created_at),
      coalesce(receiver_heartbeat_at, answered_at, created_at)
    ) < now() - interval '90 seconds';

  get diagnostics reconciled_count = row_count;
  return reconciled_count;
end;
$$;

revoke all on function public.reconcile_stale_calls() from public;
revoke all on function public.reconcile_stale_calls() from anon;
revoke all on function public.reconcile_stale_calls() from authenticated;

select cron.schedule(
  'calls-stale-reconciliation',
  '30 seconds',
  $$select public.reconcile_stale_calls();$$
);
