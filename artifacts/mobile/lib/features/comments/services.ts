import { supabase } from "../../supabase";
import { COMMENT_FIELDS, COMMENT_PAGE_SIZE, COMMENT_LIMIT, FeedComment, REPLY_PAGE_SIZE, commentLength } from "./model";

function requireResult<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("El servidor no devolvió los datos esperados.");
  return result.data;
}

export async function readComments(videoId: string, limit = COMMENT_PAGE_SIZE) {
  const [page, counted] = await Promise.all([
    readCommentPage(videoId, null, limit),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("video_id", videoId).is("deleted_at", null),
  ]);
  if (counted.error) throw new Error(counted.error.message);
  if (counted.count === null) throw new Error("No se pudo comprobar el total de comentarios.");
  return { ...page, total: counted.count };
}

export async function readReplies(videoId: string, rootId: string, limit = REPLY_PAGE_SIZE) {
  return readCommentPage(videoId, rootId, limit);
}

async function readCommentPage(videoId: string, rootId: string | null, limit: number) {
  const rows: FeedComment[] = [];
  let cursor: FeedComment | undefined;
  // Keep each request below the API row limit, including after many pages.
  while (rows.length <= limit) {
    const query = supabase.from("comments").select(COMMENT_FIELDS).eq("video_id", videoId);
    let scoped = rootId ? query.eq("root_id", rootId) : query.is("parent_id", null);
    // These values come from immutable server timestamps and UUIDs. A new
    // newest comment cannot shift the boundary and repeat a previous row.
    if (cursor) scoped = scoped.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const size = Math.min(500, limit + 1 - rows.length);
    const result = await scoped.order("created_at", { ascending: false }).order("id", { ascending: false }).range(0, size - 1);
    const batch = requireResult(result) as unknown as FeedComment[];
    rows.push(...batch);
    if (batch.length < size) break;
    cursor = batch[batch.length - 1];
  }
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function readOwnCommentLikes(userId: string | undefined, ids: string[]): Promise<Set<string>> {
  if (!userId || !ids.length) return new Set();
  const liked = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const result = await supabase.from("comment_likes").select("comment_id").eq("user_id", userId)
      .in("comment_id", ids.slice(offset, offset + 100));
    for (const row of requireResult(result)) liked.add(row.comment_id as string);
  }
  return liked;
}

export async function createComment(videoId: string, text: string, parentId: string | null, requestId: string): Promise<FeedComment> {
  const content = text.trim();
  if (!content || commentLength(content) > COMMENT_LIMIT) throw new Error("Escribe entre 1 y 300 caracteres.");
  const result = await supabase.rpc("create_feed_comment", {
    p_video_id: videoId, p_text: content, p_parent_id: parentId, p_request_id: requestId,
  });
  const rows = requireResult(result) as FeedComment[];
  if (!rows[0]?.id || rows[0].video_id !== videoId) throw new Error("No se pudo confirmar la publicación.");
  return rows[0];
}

export async function setCommentLike(commentId: string, liked: boolean): Promise<FeedComment> {
  const result = await supabase.rpc("set_feed_comment_like", { p_comment_id: commentId, p_liked: liked });
  const rows = requireResult(result) as FeedComment[];
  if (!rows[0]?.id || rows[0].id !== commentId) throw new Error("No se pudo confirmar el Me gusta.");
  return rows[0];
}

export async function readCommentCounts(videoIds: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(videoIds)];
  const counts: Record<string, number> = {};
  for (let offset = 0; offset < unique.length; offset += 100) {
    const result = await supabase.rpc("get_feed_comment_counts", { p_video_ids: unique.slice(offset, offset + 100) });
    for (const row of requireResult(result) as { video_id: string; total: number }[]) counts[row.video_id] = row.total;
  }
  return counts;
}

export async function editComment(comment: FeedComment, text: string): Promise<FeedComment> {
  const content = text.trim();
  if (!content || commentLength(content) > COMMENT_LIMIT) throw new Error("Escribe entre 1 y 300 caracteres.");
  const result = await supabase.rpc("edit_feed_comment", { p_comment_id: comment.id, p_text: content });
  const rows = requireResult(result) as FeedComment[];
  if (!rows[0]?.id || rows[0].id !== comment.id || rows[0].video_id !== comment.video_id || rows[0].text !== content || rows[0].deleted_at) throw new Error("No se pudo confirmar la edición.");
  return rows[0];
}

export async function deleteComment(commentId: string): Promise<{ id: string; removed: boolean; deleted_at: string | null }> {
  const result = await supabase.rpc("delete_feed_comment", { p_comment_id: commentId });
  const rows = requireResult(result) as { id: string; removed: boolean; deleted_at: string | null }[];
  if (rows[0]?.id !== commentId || (!rows[0].removed && !rows[0].deleted_at)) throw new Error("No se pudo confirmar la eliminación.");
  return rows[0];
}

export async function readHiddenThreads(userId: string | undefined, videoId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const result = await supabase.from("hidden_feed_comment_threads").select("root_id").eq("user_id", userId).eq("video_id", videoId);
  return new Set(requireResult(result).map(row => row.root_id as string));
}

export async function hideCommentThread(userId: string, videoId: string, rootId: string): Promise<void> {
  const result = await supabase.from("hidden_feed_comment_threads").upsert({ user_id: userId, video_id: videoId, root_id: rootId }, { onConflict: "user_id,root_id", ignoreDuplicates: true });
  if (result.error) throw new Error(result.error.message);
  if (!(await readHiddenThreads(userId, videoId)).has(rootId)) throw new Error("No se pudo confirmar que el hilo está oculto.");
}

export async function restoreCommentThreads(userId: string, videoId: string): Promise<void> {
  const result = await supabase.from("hidden_feed_comment_threads").delete().eq("user_id", userId).eq("video_id", videoId);
  if (result.error) throw new Error(result.error.message);
  if ((await readHiddenThreads(userId, videoId)).size) throw new Error("No se pudo confirmar que los hilos están visibles.");
}
