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
  // A 24dp cell leaves room for Android color-glyph bearings; the icon stays 18dp.
  const pitch = 46 * scale, glyph = 24 * scale, width = 300 * scale;
  return { pitch, glyph, width, length: Math.max(0, count - 1) * pitch + glyph };
}
