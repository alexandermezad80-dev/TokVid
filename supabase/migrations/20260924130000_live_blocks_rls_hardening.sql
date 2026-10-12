-- Keep LIVE block records inaccessible through direct Data API access.
-- Block/unblock operations remain server-authoritative through SECURITY DEFINER RPCs.
create policy "live_blocks_no_direct_access"
on public.live_blocks
as restrictive
for all
to authenticated
using (false)
with check (false);
