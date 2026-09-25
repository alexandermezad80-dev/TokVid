create table if not exists public.live_tap_totals (
  room_id uuid primary key references public.live_rooms(id) on delete cascade,
  total_taps bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint live_tap_totals_total_nonnegative check (total_taps >= 0)
);

alter table public.live_tap_totals enable row level security;

drop policy if exists live_tap_totals_authenticated_read_active on public.live_tap_totals;
create policy live_tap_totals_authenticated_read_active
on public.live_tap_totals
for select
to authenticated
using (
  exists (
    select 1 from public.live_rooms r
    where r.id = live_tap_totals.room_id and r.state = 'active'
  )
);

create or replace function public.live_send_taps(p_room_id uuid, p_count integer)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_total bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_count is null or p_count < 1 or p_count > 8 then raise exception 'Invalid tap count'; end if;
  if not exists (
    select 1 from public.live_rooms r
    where r.id = p_room_id and r.state = 'active'
  ) then raise exception 'LIVE is not active'; end if;

  insert into public.live_tap_totals (room_id, total_taps)
  values (p_room_id, p_count)
  on conflict (room_id)
  do update set
    total_taps = public.live_tap_totals.total_taps + excluded.total_taps,
    updated_at = now()
  returning total_taps into v_total;

  return v_total;
end;
$$;

revoke all on function public.live_send_taps(uuid, integer) from public;
revoke all on function public.live_send_taps(uuid, integer) from anon;
grant execute on function public.live_send_taps(uuid, integer) to authenticated;
grant select on public.live_tap_totals to authenticated;
