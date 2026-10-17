/**
 * Glass composer geometry in dp, measured against the Modal viewport.
 *
 * 360 × 802 dp reference, frame/sheet start at y=325:
 * closed bar y=728, h=74;
 * keyboard starts y=471.5 => glass panel h=146.5 and tools end at y=469.
 *
 * The system keyboard owns its height. Recalculate from measured IME overlap.
 * This helper deliberately never changes the mini video preview.
 */
export function commentsGlassGeometry({
  fullHeight, sheetTop, keyboardInset, safeBottom, keyboardVisible,
}: {
  fullHeight: number; sheetTop: number; keyboardInset: number;
  safeBottom: number; keyboardVisible: boolean;
}) {
  const headerHeight = 48;
  const closedComposerHeight = Math.max(74, safeBottom + 50);
  const keyboardGlassHeight = Math.max(0, fullHeight - keyboardInset - sheetTop);
  const keyboardComposerHeight = Math.max(0, keyboardGlassHeight - headerHeight);
  const composerTop = keyboardVisible
    ? sheetTop + headerHeight
    : fullHeight - closedComposerHeight;
  return {
    headerHeight, closedComposerHeight, keyboardGlassHeight,
    keyboardComposerHeight, composerTop,
    composerHeight: keyboardVisible ? keyboardComposerHeight : closedComposerHeight,
  };
}
