import type { SupabaseClient } from "@supabase/supabase-js";
export async function readPublishedFeedPage(client: SupabaseClient, page: number, followedAuthorIds?: string[]) {
  if (followedAuthorIds && followedAuthorIds.length === 0) return [];
  let query = client.from("videos").select("*, video_hashtags(hashtag:hashtags(tag))").order("created_at", { ascending: false }).order("id", { ascending: false });
  // Filter on the server before pagination: an older followed creator must not
  // disappear just because the most recent public page belongs to other people.
  if (followedAuthorIds) query = query.in("user_id", followedAuthorIds);
  const { data, error } = await query.range(page * 12, page * 12 + 11);
  if (error) throw error;
  return data ?? [];
}
