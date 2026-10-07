export interface CommentAnchor { x: number; y: number; width: number; height: number }

// Prefer above the selected row. Short/rotated windows may require placing it
// below; in either case it stays anchored to the row and inside the viewport.
export function commentPopoverGeometry(anchor: CommentAnchor, {
  width, availableHeight, safeTop, safeLeft = 0, safeRight = 0, menuHeight,
}: { width: number; availableHeight: number; safeTop: number; safeLeft?: number; safeRight?: number; menuHeight: number }) {
  const inset = 8;
  const leftBound = safeLeft + inset;
  const menuWidth = Math.max(0, Math.min(260, width - safeLeft - safeRight - inset * 2));
  const left = Math.min(Math.max(leftBound, anchor.x + anchor.width - menuWidth), Math.max(leftBound, width - safeRight - inset - menuWidth));
  const topBound = Math.min(safeTop + inset, Math.max(0, availableHeight - inset));
  const height = Math.min(menuHeight, Math.max(0, availableHeight - topBound - inset * 2));
  const above = anchor.y - height - inset;
  const below = anchor.y + anchor.height + inset;
  const side = above >= topBound || above - topBound >= availableHeight - inset - below - height ? "above" : "below";
  const top = Math.max(topBound, Math.min(side === "above" ? above : below, availableHeight - inset - height));
  const tip = Math.min(Math.max(18, anchor.x + anchor.width - 28 - left), Math.max(18, menuWidth - 18));
  return { left, top, width: menuWidth, maxHeight: height, side, tip };
}
