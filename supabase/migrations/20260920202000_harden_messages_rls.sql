-- #23: messages may only be updated by their sender.
-- Message deletion remains disabled until an explicit deletion feature is implemented.
drop policy if exists "participant update messages" on public.messages;

create policy "sender update own messages"
on public.messages
for update
to authenticated
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

revoke update on public.messages from authenticated;
revoke delete on public.messages from authenticated;

grant update (text, read_by_other) on public.messages to authenticated;
