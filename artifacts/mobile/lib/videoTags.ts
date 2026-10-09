import { supabase } from "./supabase";

/**
 * Extracts unique hashtags from a caption. Hashtags are lowercased so that
 * "#Dance" and "#dance" are treated as the same tag (TikTok convention).
 */
export function parseHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/**
 * Extracts unique mentions from a caption. Case is preserved so the username
 * lookup against the profiles table is exact.
 */
export function parseMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

interface SaveTagsOpts {
  videoId: string;
  caption: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
}

/**
 * Persists hashtags and mention notifications for a freshly uploaded video.
 * Best-effort: failures here must never undo the already-uploaded video, so
 * callers should swallow errors.
 */
export async function saveVideoTags(opts: SaveTagsOpts): Promise<void> {
  const hashtags = parseHashtags(opts.caption);
  const mentions = parseMentions(opts.caption);

  // ── Hashtags: create/link/increment atomically per video ──
  if (hashtags.length > 0) {
    for (const tag of hashtags) {
      const { error } = await supabase.rpc("upsert_hashtag", {
        p_tag: tag,
        p_video_id: opts.videoId,
      });
      if (error) {
        console.warn(`[videoTags] upsert_hashtag failed for #${tag}:`, error.message);
      }
    }
  }

  // ── Mentions: notify each existing mentioned user (never the author) ──
  if (mentions.length > 0) {
    // Case-insensitive match so @JakeRides resolves to "jakerides", matching
    // the tap-to-navigate behaviour in VideoInfo.
    const orFilter = mentions.map((m) => `username.ilike.${m}`).join(",");
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username")
      .or(orFilter);

    const notifications = (profs ?? [])
      .filter((p: any) => p.id !== opts.authorId)
      .map((p: any) => ({
        user_id: p.id as string,
        actor_id: opts.authorId,
        actor_name: opts.authorName,
        actor_avatar: opts.authorAvatar,
        type: "mention" as const,
        message: `${opts.authorName} te mencionó en un video`,
        data: { video_id: opts.videoId },
      }));

    if (notifications.length > 0) {
      const { data, error } = await supabase
        .from("notifications")
        .insert(notifications)
        .select("id");
      if (error) {
        console.warn("[videoTags] mention notifications failed:", error.message);
      } else if (!data || data.length < notifications.length) {
        console.warn("[videoTags] some mention notifications were not persisted (check RLS).");
      }
    }
  }
}
