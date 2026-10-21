// Native selection offsets use UTF-16; the existing comment limit counts Unicode code points.
export function insertCommentText(text: string, insertion: string, selection: { start: number; end: number }) {
  const start = Math.max(0, Math.min(text.length, selection.start));
  const end = Math.max(start, Math.min(text.length, selection.end));
  const value = text.slice(0, start) + insertion + text.slice(end);
  if (Array.from(value).length > 300) return null;
  return { text: value, cursor: start + insertion.length };
}
export function activeCommentMention(text: string, cursor: number) {
  const before = text.slice(0, cursor), match = before.match(/(?:^|\s)@([\p{L}\p{N}_.]*)$/u);
  return match ? { start: before.length - match[1].length - 1, end: cursor, query: match[1] } : null;
}
