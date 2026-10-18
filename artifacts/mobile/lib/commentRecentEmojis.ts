export const DEFAULT_COMMENT_EMOJIS = ["😂", "😍", "😮", "😢", "🔥", "👏", "❤️"];

// Complete Unicode sequences: flags, keycaps, tones, ZWJ families and tag flags.
const EMOJI = /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)/gu;
const identity = (emoji: string) => emoji.replace(/\uFE0F/g, "");
export function normalizeCommentEmojis(value: unknown): string[] {
  const result: string[] = [];
  for (const candidate of [...(Array.isArray(value) ? value : []), ...DEFAULT_COMMENT_EMOJIS]) {
    if (typeof candidate !== "string" || candidate.length > 64) continue;
    const matches = [...candidate.matchAll(EMOJI)];
    if (matches.length !== 1 || matches[0][0] !== candidate) continue;
    if (!result.some(existing => identity(existing) === identity(candidate))) result.push(candidate);
    if (result.length === 7) break;
  }
  return result;
}
export function rememberCommentEmojis(current: string[], used: string[]): string[] {
  let next = normalizeCommentEmojis(current);
  for (const emoji of used) next = normalizeCommentEmojis([emoji, ...next.filter(e => identity(e) !== identity(emoji))]);
  return next;
}
export function insertedCommentEmojis(before: string, after: string): string[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length, end = after.length;
  while (oldEnd > start && end > start && before[oldEnd - 1] === after[end - 1]) { oldEnd--; end--; }
  if (start === end) return []; // deletion or unchanged text
  return [...after.matchAll(EMOJI)].filter(match => match.index! < end && match.index! + match[0].length > start).map(match => match[0]);
}
