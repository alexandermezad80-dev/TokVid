import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { createDatabaseChannel } from "../lib/realtimeSubscriptions";
import { COMMENT_PAGE_SIZE, FeedComment, REPLY_PAGE_SIZE, commentCapabilities, mergeComments } from "../lib/features/comments/model";
import { createComment, deleteComment, editComment, hideCommentThread, readComments, readHiddenThreads, readOwnCommentLikes, readPublicationOwner, readReplies, restoreCommentThreads, setCommentLike } from "../lib/features/comments/services";

interface ThreadPage { rows: FeedComment[]; hasMore: boolean }
interface State {
  key: string; roots: FeedComment[]; threads: Record<string, ThreadPage>;
  liked: Set<string>; hiddenThreads: Set<string>; total: number | null; hasMore: boolean;
  publicationOwnerId: string | null;
}
const emptyState = (key: string): State => ({ key, roots: [], threads: {}, liked: new Set(), hiddenThreads: new Set(), total: null, hasMore: false, publicationOwnerId: null });
const errorText = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la operación. Inténtalo de nuevo.";

export function useFeedComments(visible: boolean, videoId: string, onCountChange?: (videoId: string, total: number) => void) {
  const { user } = useAuth();
  const key = `${videoId}:${user?.id ?? "guest"}`;
  const [state, setState] = useState<State>(() => emptyState(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [paging, setPaging] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const epoch = useRef(0);
  const requestSequence = useRef(0);
  const rootsLimit = useRef(COMMENT_PAGE_SIZE);
  const threadLimits = useRef(new Map<string, number>());
  const sendLock = useRef(false);
  const pagingLock = useRef(false);
  const mutationLock = useRef(false);
  const likeLocks = useRef(new Set<string>());
  const pendingSend = useRef<{ payload: string; id: string } | null>(null);
  const countCallback = useRef(onCountChange);
  const currentContext = useRef({ key, visible });
  currentContext.current = { key, visible };
  countCallback.current = onCountChange;

  const refresh = useCallback(async () => {
    if (!visible || !videoId) return;
    const currentEpoch = epoch.current;
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const [roots, pages, publicationOwnerId] = await Promise.all([
        readComments(videoId, rootsLimit.current),
        Promise.all([...threadLimits.current].map(async ([rootId, limit]) => [rootId, await readReplies(videoId, rootId, limit)] as const)),
        readPublicationOwner(videoId),
      ]);
      const threads = Object.fromEntries(pages);
      const ids = [...roots.rows, ...pages.flatMap(([, page]) => page.rows)].map(row => row.id);
      const [liked, hiddenThreads] = await Promise.all([readOwnCommentLikes(user?.id, ids), readHiddenThreads(user?.id, videoId)]);
      if (epoch.current !== currentEpoch || requestSequence.current !== sequence) return;
      setState({ key, roots: roots.rows, threads, liked, hiddenThreads, total: roots.total, hasMore: roots.hasMore, publicationOwnerId });
      setError("");
      countCallback.current?.(videoId, roots.total);
    } catch (failure) {
      if (epoch.current === currentEpoch && requestSequence.current === sequence) setError(errorText(failure));
    } finally {
      if (epoch.current === currentEpoch && requestSequence.current === sequence) setLoading(false);
    }
  }, [visible, videoId, user?.id, key]);

  useEffect(() => {
    epoch.current++;
    requestSequence.current++;
    rootsLimit.current = COMMENT_PAGE_SIZE;
    threadLimits.current.clear();
    pendingSend.current = null;
    sendLock.current = false;
    pagingLock.current = false;
    mutationLock.current = false;
    likeLocks.current.clear();
    setState(emptyState(key)); setExpanded(new Set()); setError(""); setOperationError("");
    setSending(false); setPaging(false); setMutating(false); setPendingLikes(new Set());
    if (!visible || !videoId) { setLoading(false); return; }
    setLoading(true);
    void refresh();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => { if (!active) return; clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 100); };
    const channel = createDatabaseChannel(`feed-comments:${videoId}:${user?.id ?? "guest"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` }, invalidate)
      // DELETE events cannot be filtered reliably under RLS: use them to re-fetch.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, invalidate);
    channel.subscribe(status => {
        if (!active) return;
        if (status === "SUBSCRIBED") invalidate();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("No se pudo mantener la conexión en tiempo real. Puedes volver a cargar los comentarios.");
        }
      });
    const appState = AppState.addEventListener("change", next => { if (next === "active") invalidate(); });
    return () => { active = false; epoch.current++; clearTimeout(timer); appState.remove(); void supabase.removeChannel(channel); };
  }, [visible, videoId, user?.id, key, refresh]);

  const loadMore = async () => {
    if (pagingLock.current || !state.hasMore) return;
    const currentEpoch = epoch.current;
    pagingLock.current = true; setPaging(true);
    rootsLimit.current += COMMENT_PAGE_SIZE;
    await refresh();
    if (epoch.current === currentEpoch) { pagingLock.current = false; setPaging(false); }
  };

  const toggleThread = async (rootId: string) => {
    if (expanded.has(rootId)) {
      setExpanded(previous => { const next = new Set(previous); next.delete(rootId); return next; });
      threadLimits.current.delete(rootId);
      return;
    }
    threadLimits.current.set(rootId, REPLY_PAGE_SIZE);
    setExpanded(previous => new Set(previous).add(rootId));
    await refresh();
  };
  const moreReplies = async (rootId: string) => {
    if (pagingLock.current) return;
    const currentEpoch = epoch.current;
    pagingLock.current = true; setPaging(true);
    threadLimits.current.set(rootId, (threadLimits.current.get(rootId) ?? REPLY_PAGE_SIZE) + REPLY_PAGE_SIZE);
    await refresh();
    if (epoch.current === currentEpoch) { pagingLock.current = false; setPaging(false); }
  };

  const publish = async (text: string, parentId: string | null): Promise<FeedComment | null> => {
    if (!user || !visible || currentContext.current.key !== key || !currentContext.current.visible || sendLock.current || mutationLock.current) return null;
    const currentEpoch = epoch.current;
    sendLock.current = true; setSending(true); setOperationError("");
    const payload = JSON.stringify([key, text.trim(), parentId]);
    if (pendingSend.current?.payload !== payload) pendingSend.current = { payload, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    try {
      const row = await createComment(videoId, text, parentId, pendingSend.current.id);
      if (epoch.current !== currentEpoch) return null;
      pendingSend.current = null;
      setState(previous => ({ ...previous,
        roots: row.parent_id ? previous.roots : mergeComments(previous.roots, [row]),
        threads: row.root_id ? { ...previous.threads, [row.root_id]: {
          rows: mergeComments(previous.threads[row.root_id]?.rows ?? [], [row]),
          hasMore: previous.threads[row.root_id]?.hasMore ?? false,
        } } : previous.threads,
      }));
      if (row.root_id) {
        threadLimits.current.set(row.root_id, threadLimits.current.get(row.root_id) ?? REPLY_PAGE_SIZE);
        setExpanded(previous => new Set(previous).add(row.root_id!));
      }
      await refresh();
      return epoch.current === currentEpoch ? row : null;
    } catch (failure) {
      if (epoch.current === currentEpoch) setOperationError(errorText(failure));
      return null;
    } finally {
      if (epoch.current === currentEpoch) { sendLock.current = false; setSending(false); }
    }
  };

  const like = async (comment: FeedComment) => {
    if (!user || !visible || currentContext.current.key !== key || !currentContext.current.visible || mutationLock.current || comment.deleted_at || likeLocks.current.has(comment.id)) return;
    const currentEpoch = epoch.current;
    const desired = !state.liked.has(comment.id);
    likeLocks.current.add(comment.id); setPendingLikes(new Set(likeLocks.current)); setOperationError("");
    try {
      const row = await setCommentLike(comment.id, desired);
      if (epoch.current !== currentEpoch) return;
      setState(previous => {
        const liked = new Set(previous.liked);
        if (desired) liked.add(row.id); else liked.delete(row.id);
        return { ...previous, liked,
          roots: previous.roots.map(item => item.id === row.id ? row : item),
          threads: Object.fromEntries(Object.entries(previous.threads).map(([id, page]) => [id, { ...page, rows: page.rows.map(item => item.id === row.id ? row : item) }])),
        };
      });
      await refresh();
    } catch (failure) {
      if (epoch.current === currentEpoch) setOperationError(errorText(failure));
    } finally {
      if (epoch.current === currentEpoch) { likeLocks.current.delete(comment.id); setPendingLikes(new Set(likeLocks.current)); }
    }
  };

  const mutate = async <T,>(operation: () => Promise<T>, apply?: (result: T) => void): Promise<T | null> => {
    if (!user || !visible || currentContext.current.key !== key || !currentContext.current.visible || mutationLock.current || sendLock.current) return null;
    const currentEpoch = epoch.current;
    mutationLock.current = true; setMutating(true); setOperationError("");
    try {
      const result = await operation();
      if (epoch.current !== currentEpoch) return null;
      apply?.(result);
      await refresh();
      return epoch.current === currentEpoch ? result : null;
    } catch (failure) {
      if (epoch.current === currentEpoch) setOperationError(errorText(failure));
      return null;
    } finally {
      if (epoch.current === currentEpoch) { mutationLock.current = false; setMutating(false); }
    }
  };
  const edit = (comment: FeedComment, text: string) => {
    if (comment.user_id !== user?.id || comment.deleted_at || comment.video_id !== videoId) return Promise.resolve(null);
    return mutate(() => editComment(comment, text), row => setState(previous => ({ ...previous,
      roots: previous.roots.map(item => item.id === row.id ? row : item),
      threads: Object.fromEntries(Object.entries(previous.threads).map(([id, page]) => [id, { ...page, rows: page.rows.map(item => item.id === row.id ? row : item) }])),
    })));
  };
  const remove = (comment: FeedComment) => {
    if (!commentCapabilities(comment, user?.id, state.publicationOwnerId).canDelete || comment.video_id !== videoId) return Promise.resolve(null);
    if (likeLocks.current.has(comment.id)) return Promise.resolve(null);
    return mutate(() => deleteComment(comment.id), () => {
      if (!comment.parent_id) {
        threadLimits.current.delete(comment.id);
        setExpanded(previous => { const next = new Set(previous); next.delete(comment.id); return next; });
      }
      setState(previous => {
        const all = [...previous.roots, ...Object.values(previous.threads).flatMap(page => page.rows)];
        const parent = all.find(row => row.id === comment.parent_id);
        const removed = new Set(all.filter(row => row.id === comment.id || (!comment.parent_id && row.root_id === comment.id)).map(row => row.id));
        const updateRows = (rows: FeedComment[]) => rows.filter(row => !removed.has(row.id)).map(row => row.parent_id === comment.id ? { ...row, parent_id: comment.parent_id, reply_to_username: parent?.username ?? null } : row);
        const liked = new Set(previous.liked); for (const id of removed) liked.delete(id);
        const hiddenThreads = new Set(previous.hiddenThreads); if (!comment.parent_id) hiddenThreads.delete(comment.id);
        return { ...previous, liked, hiddenThreads, roots: updateRows(previous.roots),
          threads: Object.fromEntries(Object.entries(previous.threads).filter(([id]) => comment.parent_id || id !== comment.id).map(([id, page]) => [id, { ...page, rows: updateRows(page.rows) }])) };
      });
    });
  };
  const hideThread = (comment: FeedComment) => {
    if (!user || comment.video_id !== videoId) return Promise.resolve(null);
    const rootId = comment.root_id ?? comment.id;
    return mutate(async () => { await hideCommentThread(user.id, videoId, rootId); return true; }, () => setState(previous => ({ ...previous, hiddenThreads: new Set(previous.hiddenThreads).add(rootId) })));
  };
  const restoreThreads = () => {
    if (!user) return Promise.resolve(null);
    return mutate(async () => { await restoreCommentThreads(user.id, videoId); return true; }, () => setState(previous => ({ ...previous, hiddenThreads: new Set() })));
  };

  return { ...(state.key === key ? state : emptyState(key)), loading, error: operationError || error, sending, pendingLikes, paging, mutating, expanded,
    refresh, loadMore, toggleThread, moreReplies, publish, like, edit, remove, hideThread, restoreThreads };
}

