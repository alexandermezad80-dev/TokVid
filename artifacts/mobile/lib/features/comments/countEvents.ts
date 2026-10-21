// Personal deletion does not emit a public comments change. Refresh mounted counters explicitly.
const listeners = new Set<(videoId: string) => void>();
export function invalidateCommentCounts(videoId: string) { for (const listener of listeners) listener(videoId); }
export function subscribeCommentCounts(listener: (videoId: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
