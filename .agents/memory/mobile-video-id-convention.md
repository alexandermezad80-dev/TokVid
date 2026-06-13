---
name: Mobile video_id convention (mock vs real)
description: Why tables referencing videos use text video_id, not a uuid FK, in artifacts/mobile.
---

The Tokvid feed mixes two kinds of videos:
- **Demo/seed videos** from `BASE_VIDEOS` (hooks/useVideoFeed.ts) with string ids `"1".."6"` — NOT rows in the `videos` table.
- **Real uploaded videos** = uuid rows in the `videos` table.

**Rule:** Any table that references a video (e.g. `comments`, `saved_videos`) must store `video_id` as **`text`**, never a `uuid REFERENCES videos(id)` FK.

**Why:** A uuid FK rejects the demo ids (not valid uuids and not present in `videos`), which silently breaks the feature for almost every video shown in the feed. `comments.video_id` already uses `text` for this reason.

**How to apply:**
- When building any per-video feature, store `video_id text`.
- When resolving a list of saved/related video ids back into full items, pull demo ids from `BASE_VIDEOS` and fetch the remaining (real uuid) ids from `videos`, then map via `mapRowsToVideoItems` (exported from useVideoFeed.ts). Do not derive the list from `BASE_VIDEOS` alone — real videos would never appear.
