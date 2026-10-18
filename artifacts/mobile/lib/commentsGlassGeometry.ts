/** Comments-only presentation. Coordinates are local to the measured Modal. */
export function commentsGlassGeometry({
  fullHeight, availableHeight, sheetTop, safeBottom, keyboardVisible,
  screenHeight = fullHeight, viewportTop = 0,
}: {
  fullHeight: number; availableHeight: number; sheetTop: number;
  safeBottom: number; keyboardVisible: boolean;
  screenHeight?: number; viewportTop?: number;
}) {
  const headerHeight = 56;
  const closedComposerHeight = 74;
  // The reference's 23.5dp bottom clearance already contains compact gesture
  // insets (rounded to 24dp). Reserve larger system bars outside the composer.
  // Their measured inset is used; never assume a fixed 42dp navigation bar.
  const systemBottom = safeBottom > 24 ? safeBottom : 0;
  // A Modal may already exclude system bars; do not subtract them twice.
  const closedBottom = Math.max(0, Math.min(fullHeight, screenHeight - viewportTop - systemBottom));
  const keyboardGlassHeight = keyboardVisible ? Math.max(0, availableHeight - sheetTop) : 0;
  const keyboardComposerHeight = Math.max(0, keyboardGlassHeight - headerHeight);
  const composerTop = keyboardVisible
    ? Math.min(availableHeight, sheetTop + headerHeight)
    : Math.max(sheetTop, closedBottom - closedComposerHeight);
  return {
    headerHeight, closedComposerHeight, closedBottom,
    closedSheetHeight: Math.max(0, closedBottom - sheetTop),
    keyboardGlassHeight, keyboardComposerHeight, composerTop,
    composerHeight: keyboardVisible ? keyboardComposerHeight : Math.max(0, closedBottom - composerTop),
  };
}
