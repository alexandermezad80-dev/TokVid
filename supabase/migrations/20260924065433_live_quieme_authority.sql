create policy "live_quieme_authenticated_insert_own"
on public.live_quieme
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and user_id <> host_id
  and exists (
    select 1
    from public.live_rooms r
    join public.live_participants p on p.room_id = r.id
    where r.id = live_quieme.room_id
      and r.state = 'active'
      and r.host_id = live_quieme.host_id
      and p.user_id = (select auth.uid())
      and p.participation_state in ('spectator','active')
  )
);

create or replace function public.live_send_quieme(p_room_id uuid)
returns table (
  quieme_id uuid,
  host_id uuid,
  followed_host boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_host_id uuid;
  v_quieme_id uuid;
  v_follow_rows integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select r.host_id
    into v_host_id
  from public.live_rooms r
  where r.id = p_room_id
    and r.state = 'active';

  if v_host_id is null then
    raise exception 'LIVE is not active';
  end if;

  if v_user_id = v_host_id then
    raise exception 'host cannot give Quiéreme to self';
  end if;

  if not exists (
    select 1
    from public.live_participants p
    where p.room_id = p_room_id
      and p.user_id = v_user_id
      and p.participation_state in ('spectator','active')
  ) then
    raise exception 'user is not an active LIVE participant';
  end if;

  insert into public.live_quieme (room_id, user_id, host_id)
  values (p_room_id, v_user_id, v_host_id)
  on conflict (room_id, user_id) do nothing
  returning id into v_quieme_id;

  if v_quieme_id is null then
    select q.id into v_quieme_id
    from public.live_quieme q
    where q.room_id = p_room_id
      and q.user_id = v_user_id;
  end if;

  insert into public.follows (follower_id, following_id)
  values (v_user_id, v_host_id)
  on conflict (follower_id, following_id) do nothing;

  get diagnostics v_follow_rows = row_count;

  return query
  select v_quieme_id, v_host_id, (v_follow_rows = 1);
end;
$$;

revoke execute on function public.live_send_quieme(uuid) from public, anon;
grant execute on function public.live_send_quieme(uuid) to authenticated;
