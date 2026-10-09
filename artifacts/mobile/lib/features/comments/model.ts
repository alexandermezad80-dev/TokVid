export interface FeedComment {
  id: string;
  video_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
  parent_id: string | null;
  root_id: string | null;
  reply_to_username: string | null;
  likes_count: number;
  reply_count: number;
  edited_at?: string | null;
  deleted_at?: string | null;
  sticker_id?: string | null;
}

export const COMMENT_PAGE_SIZE = 30;
export const REPLY_PAGE_SIZE = 20;
export const COMMENT_LIMIT = 300;
export const COMMENT_FIELDS = "id,video_id,user_id,username,avatar_url,text,created_at,parent_id,root_id,reply_to_username,likes_count,reply_count,edited_at,deleted_at,sticker_id";

export function mergeComments(rows: FeedComment[], incoming: FeedComment[]): FeedComment[] {
  const byId = new Map(rows.map(row => [row.id, row]));
  for (const row of incoming) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

export function commentTime(createdAt: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  if (seconds < 60) return "ahora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function commentLength(text: string): number { return Array.from(text).length; }

export function commentCapabilities(comment: FeedComment, userId?: string, publicationOwnerId?: string | null) {
  const own = !!userId && comment.user_id === userId;
  return {
    canReply: !!userId && !comment.deleted_at,
    canEdit: own && !comment.deleted_at,
    canDelete: !!userId && (own || publicationOwnerId === userId),
  };
}
