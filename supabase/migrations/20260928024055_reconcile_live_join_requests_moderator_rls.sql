drop policy if exists live_join_requests_authenticated_read_own_host_or_moderator on public.live_join_requests;

create policy live_join_requests_authenticated_read_own_host_or_moderator
on public.live_join_requests
for select
to authenticated
using (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.live_rooms r
    where r.id = live_join_requests.room_id
      and r.host_id = auth.uid()
  )
  or public.live_actor_has_permission(
    live_join_requests.room_id,
    auth.uid(),
    'manage_requests'
  )
);
