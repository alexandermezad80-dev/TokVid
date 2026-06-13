---
name: Notifications insert policy
description: Correct RLS for client-side inserts into the notifications table.
---
Client-side inserts into `notifications` (e.g. creating a 'mention' notification for another user) must be gated by `WITH CHECK (auth.uid() = actor_id)`, scoped `TO authenticated`.

**Why:** the original policy was `WITH CHECK (true)`, which lets any logged-in client fabricate notifications for any `user_id` as any `actor` (broken access control / spoofing). The author of an action is always the actor, so `auth.uid() = actor_id` is both correct and safe. The notification's `user_id` (recipient) is intentionally someone else, so do NOT gate on `user_id`.

**How to apply:** when a feature inserts notifications from the mobile client, set `actor_id` to the current user and rely on this policy. Combined with the RLS-silent-failure gotcha, chain `.select()` on the insert to confirm rows landed.
