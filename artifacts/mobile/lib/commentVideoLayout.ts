export interface VideoPreviewFrame { x: number; y: number; width: number; height: number }

// The preview and panel share the same already-measured, keyboard-safe window.
export function commentVideoLayout({
  width, availableHeight, safeTop, safeLeft = 0, safeRight = 0,
  bottomPadding, desiredSheetHeight, keyboardVisible,
}: {
  width: number; availableHeight: number; safeTop: number;
  safeLeft?: number; safeRight?: number; bottomPadding: number;
  desiredSheetHeight: number; keyboardVisible: boolean;
}) {
  const top = Math.max(0, safeTop) + 10;
  const available = Math.max(0, availableHeight - top - bottomPadding);
  const gap = Math.min(10, available);
  const innerWidth = Math.max(0, width - safeLeft - safeRight - 24);
  const desiredPreview = Math.min(keyboardVisible ? 160 : 224, available * (keyboardVisible ? 0.33 : 0.32), innerWidth * 16 / 9);
  const height = Math.max(0, Math.min(desiredPreview, available - gap - Math.min(164, available * 0.65)));
  const sheetHeight = Math.max(0, Math.min(desiredSheetHeight, available - height - gap));
  const previewSpace = Math.max(0, available - sheetHeight);
  const preview: VideoPreviewFrame = {
    x: safeLeft + (Math.max(0, width - safeLeft - safeRight) - height * 9 / 16) / 2,
    y: top + Math.max(0, (previewSpace - gap - height) / 2),
    width: height * 9 / 16,
    height,
  };
  return { sheetHeight, preview };
}
