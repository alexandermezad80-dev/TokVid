begin;

-- Social integrity: cover the FK used by reverse follow lookups.
create index if not exists follows_following_id_idx
  on public.follows(following_id);

-- saved_videos intentionally remains text for legacy saved IDs (2, 4, 6).
-- The current feed uses persisted UUID videos, but legacy saves must not be
-- destroyed just to force a new FK contract.

-- Messages: recipients may mark received messages as read, but nobody may
-- edit message text through UPDATE. The sender may delete their own message.
drop policy if exists "participant update messages" on public.messages;
drop policy if exists "sender update own messages" on public.messages;
drop policy if exists "recipient mark message read" on public.messages;
drop policy if exists "sender delete own messages" on public.messages;

revoke update on public.messages from anon;
revoke update on public.messages from authenticated;
grant update (read_by_other) on public.messages to authenticated;

create policy "recipient mark message read"
  on public.messages
  for update
  to authenticated
  using (
    (select auth.uid()) <> sender_id
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.user1_id = (select auth.uid())
          or c.user2_id = (select auth.uid())
        )
    )
  )
  with check (
    (select auth.uid()) <> sender_id
    and read_by_other = true
  );

create policy "sender delete own messages"
  on public.messages
  for delete
  to authenticated
  using ((select auth.uid()) = sender_id);

commit;
