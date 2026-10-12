-- Harden LIVE Chat read access.
-- Chat writes/moderation remain server-authoritative through SECURITY DEFINER RPCs.
-- Only active LIVE participants can read visible chat content, and blocked users
-- lose chat access immediately.

drop policy if exists "live_chat_authenticated_read_active"
on public.live_chat_messages;

create policy "live_chat_authenticated_read_participants"
on public.live_chat_messages
for select
to authenticated
using (
  moderation_state = 'visible'
  and exists (
    select 1
    from public.live_rooms r
    join public.live_participants p
      on p.room_id = r.id
    where r.id = live_chat_messages.room_id
      and r.state = 'active'
      and p.user_id = (select auth.uid())
      and p.participation_state in ('spectator', 'active')
  )
  and not exists (
    select 1
    from public.live_blocks b
    where b.room_id = live_chat_messages.room_id
      and b.user_id = (select auth.uid())
      and b.revoked_at is null
  )
);

drop policy if exists "live_pinned_message_authenticated_read_active"
on public.live_pinned_message;

create policy "live_pinned_message_authenticated_read_participants"
on public.live_pinned_message
for select
to authenticated
using (
  unpinned_at is null
  and exists (
    select 1
    from public.live_rooms r
    join public.live_participants p
      on p.room_id = r.id
    where r.id = live_pinned_message.room_id
      and r.state = 'active'
      and p.user_id = (select auth.uid())
      and p.participation_state in ('spectator', 'active')
  )
  and not exists (
    select 1
    from public.live_blocks b
    where b.room_id = live_pinned_message.room_id
      and b.user_id = (select auth.uid())
      and b.revoked_at is null
  )
  and exists (
    select 1
    from public.live_chat_messages m
    where m.id = live_pinned_message.message_id
      and m.moderation_state = 'visible'
  )
);
