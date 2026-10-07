import { supabase } from "../../supabase";

export interface VideoLikeState { video_id: string; total: number; liked: boolean }

export async function readVideoLikes(videoIds: string[], userId?: string): Promise<{ counts: Record<string, number>; liked: Set<string> }> {
  const unique = [...new Set(videoIds)];
  const counts: Record<string, number> = {};
  const liked = new Set<string>();
  for (let offset = 0; offset < unique.length; offset += 100) {
    const ids = unique.slice(offset, offset + 100);
    const [totals, own] = await Promise.all([
      supabase.rpc("get_feed_video_like_counts", { p_video_ids: ids }),
      userId ? supabase.from("video_likes").select("video_id").eq("user_id", userId).in("video_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    if (totals.error) throw new Error(totals.error.message);
    if (own.error) throw new Error(own.error.message);
    for (const row of totals.data ?? []) {
      if (!ids.includes(row.video_id) || !Number.isInteger(row.total) || row.total < 0) throw new Error("No se pudo confirmar el contador de Me gusta.");
      counts[row.video_id] = row.total;
    }
    if (ids.some(id => counts[id] === undefined)) throw new Error("No se pudo confirmar el contador de Me gusta.");
    for (const row of own.data ?? []) liked.add(row.video_id);
  }
  return { counts, liked };
}

export async function setVideoLike(videoId: string, liked: boolean): Promise<VideoLikeState> {
  const result = await supabase.rpc("set_feed_video_like", { p_video_id: videoId, p_liked: liked });
  if (result.error) throw new Error(result.error.message);
  const row = result.data?.[0] as VideoLikeState | undefined;
  if (!row || row.video_id !== videoId || typeof row.liked !== "boolean" || !Number.isInteger(row.total) || row.total < 0) throw new Error("No se pudo confirmar el Me gusta.");
  return row;
}
