import { COMMENT_EMOJI_CATALOG } from "./commentEmojiCatalog";
import { normalizeCommentEmojis } from "./commentRecentEmojis";

export function commentEmojiOrder(recent: string[]): string[] {
  const seen = new Set<string>();
  return [...normalizeCommentEmojis(recent), ...COMMENT_EMOJI_CATALOG].filter(emoji => {
    const key = emoji.replace(/\uFE0F/g, "");
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

/** Keep the row stationary while browsing; install the latest order at its start. */
export function commentEmojiStripGeometry(scale: number, count: number) {
  const pitch = 47 * scale, glyph = 18 * scale, width = 300 * scale;
  return { pitch, glyph, width, length: Math.max(0, count - 1) * pitch + glyph };
}
