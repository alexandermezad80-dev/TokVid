export interface VideoPreviewFrame { x: number; y: number; width: number; height: number }

/**
 * Geometry for the existing feed video, not a second player.
 * Reference (360 × 802 dp): frame 155 × 275 at screen y=42; sheet y=325.
 * The modal may have its own window origin, so preview.y is modal-local,
 * while the frame reported to VideoCard is converted to screen coordinates.
 * The keyboard must never resize or move this frame.
 */
export function commentVideoLayout({
  width, availableHeight, safeTop, safeLeft = 0, safeRight = 0,
  viewportTop = 0, bottomPadding, desiredSheetHeight, keyboardVisible,
}: {
  width: number; availableHeight: number; safeTop: number;
  safeLeft?: number; safeRight?: number; viewportTop?: number;
  bottomPadding: number; desiredSheetHeight: number; keyboardVisible: boolean;
}) {
  // The top is measured from the physical screen, respecting taller status bars.
  const screenTop = Math.max(42, Math.max(0, safeTop) + 17);
  const top = Math.max(0, screenTop - viewportTop);
  const horizontalSpace = Math.max(0, width - safeLeft - safeRight);
  const maxPreviewWidth = Math.max(0, horizontalSpace - 24);
  // Preserve room for the comments on shorter screens without distorting 9:16.
  const reservedSheetHeight = Math.min(240, availableHeight * 0.4);
  const maxPreviewHeight = Math.max(0, availableHeight - top - 8 - reservedSheetHeight);
  const scale = Math.max(0, Math.min(1, maxPreviewWidth / 155, maxPreviewHeight / 275));
  const previewWidth = 155 * scale;
  const previewHeight = 275 * scale;
  const preview: VideoPreviewFrame = {
    x: safeLeft + (horizontalSpace - previewWidth) / 2,
    y: top,
    width: previewWidth,
    height: previewHeight,
  };
  const sheetHeight = Math.max(0, availableHeight - top - previewHeight - 8);
  return { sheetHeight, preview };
}
