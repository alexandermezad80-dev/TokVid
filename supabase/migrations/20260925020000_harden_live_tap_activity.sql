create table if not exists public.live_tap_activity (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tap_count bigint not null default 0 check (tap_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_live_tap_activity_room_count
  on public.live_tap_activity(room_id, tap_count desc);

alter table public.live_tap_activity enable row level security;

 drop policy if exists "live_tap_activity_host_read" on public.live_tap_activity;
create policy "live_tap_activity_host_read"
  on public.live_tap_activity
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_rooms r
      where r.id = live_tap_activity.room_id
        and r.host_id = (select auth.uid())
        and r.state = 'active'
    )
  );

create or replace function public.live_send_taps(p_room_id uuid, p_count integer)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total bigint;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_count is null or p_count < 1 or p_count > 8 then
    raise exception 'Invalid tap count';
  end if;

  if not exists (
    select 1 from public.live_rooms
    where id = p_room_id and state = 'active'
  ) then
    raise exception 'LIVE is not active';
  end if;

  if not exists (
    select 1 from public.live_participants
    where room_id = p_room_id
      and user_id = v_user
      and participation_state in ('active', 'spectator')
  ) then
    raise exception 'User is not participating in this LIVE';
  end if;

  insert into public.live_tap_totals(room_id, total_taps)
  values (p_room_id, p_count)
  on conflict (room_id)
  do update set
    total_taps = public.live_tap_totals.total_taps + excluded.total_taps,
    updated_at = now()
  returning total_taps into v_total;

  insert into public.live_tap_activity(room_id, user_id, tap_count, updated_at)
  values (p_room_id, v_user, p_count, now())
  on conflict (room_id, user_id)
  do update set
    tap_count = public.live_tap_activity.tap_count + excluded.tap_count,
    updated_at = now();

  return v_total;
end;
$$;

revoke execute on function public.live_send_taps(uuid, integer) from anon, public;
grant execute on function public.live_send_taps(uuid, integer) to authenticated;

alter publication supabase_realtime add table public.live_tap_activity;
