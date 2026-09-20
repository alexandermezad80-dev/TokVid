-- #22: restrict conversation participant updates to mutable message metadata.
drop policy if exists "participant update convos" on public.conversations;

create policy "participant update conversation metadata"
on public.conversations
for update
to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id)
with check (auth.uid() = user1_id or auth.uid() = user2_id);

revoke update on public.conversations from authenticated;
grant update (last_message, last_message_at) on public.conversations to authenticated;
