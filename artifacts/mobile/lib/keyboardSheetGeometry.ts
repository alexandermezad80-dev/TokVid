export function keyboardSheetGeometry({
  viewportHeight, viewportTop, screenHeight, keyboardTop, safeTop, tabBarHeight = 0,
}: {
  viewportHeight: number; viewportTop: number; screenHeight: number;
  keyboardTop: number | null; safeTop: number; tabBarHeight?: number;
}) {
  const keyboardVisible = keyboardTop !== null;
  const keyboardInset = keyboardTop === null ? 0 : Math.min(viewportHeight, Math.max(0, viewportTop + viewportHeight - keyboardTop));
  const availableHeight = Math.max(0, viewportHeight - keyboardInset);
  const topClearance = Math.max(0, safeTop - viewportTop) + 12;
  const registrationGap = keyboardVisible ? 12 : tabBarHeight + 12;
  return {
    keyboardVisible, keyboardInset, availableHeight,
    commentsHeight: Math.max(0, Math.min(screenHeight * 0.75, availableHeight - topClearance)),
    registrationGap,
    registrationMaxHeight: Math.max(0, availableHeight - topClearance - registrationGap),
  };
}
