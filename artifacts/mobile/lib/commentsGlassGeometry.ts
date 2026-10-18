/**
 * Glass composer geometry in dp, measured against the Modal viewport.
 *
 * The keyboard top is supplied as availableHeight from keyboardSheetGeometry:
 * it is measured in this viewport's coordinates, so system bars and modal
 * offsets cannot create an empty strip under the composer.
 */
export function commentsGlassGeometry({
  fullHeight, availableHeight, sheetTop, safeBottom, keyboardVisible,
}: {
  fullHeight: number; availableHeight: number; sheetTop: number;
  safeBottom: number; keyboardVisible: boolean;
}) {
  const headerHeight = 48;
  const closedComposerHeight = Math.max(74, safeBottom + 50);
  const keyboardGlassHeight = keyboardVisible
    ? Math.max(0, availableHeight - sheetTop)
    : 0;
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
