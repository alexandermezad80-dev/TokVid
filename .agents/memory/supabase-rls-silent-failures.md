---
name: Supabase RLS silent failures
description: supabase-js delete/update do not throw when RLS blocks the operation — they return empty data, not an error
---

# Supabase RLS silent failures

`supabase.from(table).delete()/.update()` do **not** throw and do **not** populate
`error` when a Row Level Security policy blocks the row. They return successfully
with an empty result set.

**Why:** This caused a "delete my video" bug where the UI showed a success toast
and optimistically removed the video from the feed even though the backend delete
was silently blocked (no RLS delete policy / not the owner). User saw "deleted" but
the video reappeared on refresh.

**How to apply:** For any mutation whose success matters, chain `.select("id")` (or
some column) onto the delete/update and verify `data && data.length > 0` before
treating it as success. Do not rely on `error` alone. Prefer pessimistic UI updates
(confirm backend first, then mutate local state) over optimistic-without-rollback.
