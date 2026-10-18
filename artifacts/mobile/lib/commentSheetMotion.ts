/** Pure UI-thread geometry: one sheet and editor, throughout every IME frame. */
export function commentSheetMotion({ sheetTop, closedBottom, screenHeight, viewportTop, keyboardHeight, progress, scale = 1 }: {
  sheetTop: number; closedBottom: number; screenHeight: number; viewportTop: number;
  keyboardHeight: number; progress: number; scale?: number;
}) {
  "worklet";
  const p = Math.max(0, Math.min(1, progress));
  const headerHeight = 56 * scale;
  const bottom = Math.max(sheetTop, Math.min(closedBottom, screenHeight - viewportTop - Math.max(0, keyboardHeight)));
  const composerHeight = Math.min((74 + 16.5 * p) * scale, Math.max(0, bottom - sheetTop - headerHeight));
  const composerTop = Math.max(headerHeight, bottom - sheetTop - composerHeight);
  return { composerTop, composerHeight, bodyHeight: Math.max(0, composerTop - headerHeight), bottom, progress: p };
}
