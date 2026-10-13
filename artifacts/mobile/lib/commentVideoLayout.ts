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
  // H is the complete scene height, never the height left above the keyboard.
  const top = Math.max(0, safeTop) + 8;
  const innerWidth = Math.max(0, width - safeLeft - safeRight - 24);
  const height = Math.max(0, Math.min((availableHeight-safeTop)*0.36,innerWidth*16/9));
  const preview: VideoPreviewFrame = {
    x:safeLeft+(Math.max(0,width-safeLeft-safeRight)-height*9/16)/2,
    y:top,width:height*9/16,height,
  };
  const sheetHeight=Math.max(0,availableHeight-top-height-8);
  return {sheetHeight,preview};
}
