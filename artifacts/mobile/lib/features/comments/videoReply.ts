import type { SupabaseClient } from "@supabase/supabase-js";
export interface VideoReplyTarget {
  id: string; video_id: string; username: string; text: string;
}
export async function readVideoReplyTarget(client: SupabaseClient, commentId: string): Promise<VideoReplyTarget> {
  const { data, error } = await client.from("comments").select("id,video_id,username,text,deleted_at").eq("id", commentId).maybeSingle();
  if (error) throw error;
  if (!data || data.deleted_at) throw new Error("El comentario original ya no está disponible.");
  return { id: data.id, video_id: data.video_id, username: data.username, text: data.text };
}
