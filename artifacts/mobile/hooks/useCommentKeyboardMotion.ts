import { useEffect, useState } from "react";
import { useGenericKeyboardHandler } from "react-native-keyboard-controller";
import { Easing, runOnJS, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

// Local to comments: leave chat, Auth and the shared viewport/IME policy alone.
export function useCommentKeyboardMotion(active: boolean) {
  const height = useSharedValue(0), progress = useSharedValue(0);
  const bodyOpacity = useSharedValue(1), controlsOpacity = useSharedValue(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  useEffect(() => {
    if (!active) { height.value = 0; progress.value = 0; bodyOpacity.value = 1; controlsOpacity.value = 0; setControlsOpen(false); }
  }, [active]);
  useGenericKeyboardHandler({
    onStart: event => {
      "worklet";
      if (!active) return;
      const opening = event.height > 0;
      const duration = event.duration > 0 ? event.duration : 250;
      const timing = { duration, easing: Easing.out(Easing.cubic) };
      runOnJS(setControlsOpen)(opening);
      height.value = withTiming(event.height, timing);
      progress.value = withTiming(opening ? 1 : 0, timing);
      bodyOpacity.value = opening ? withTiming(0, { duration: duration * .48 }) : withDelay(duration * .4, withTiming(1, { duration: duration * .6 }));
      controlsOpacity.value = opening ? withDelay(duration * .4, withTiming(1, { duration: duration * .6 })) : withTiming(0, { duration: duration * .48 });
    },
    onMove: event => { "worklet"; if (active) { height.value = event.height; progress.value = event.progress; } },
    onInteractive: event => { "worklet"; if (active) { height.value = event.height; progress.value = event.progress; bodyOpacity.value = 1 - event.progress; controlsOpacity.value = event.progress; } },
    onEnd: event => {
      "worklet";
      if (!active) return;
      height.value = event.height; progress.value = event.height > 0 ? 1 : 0;
      bodyOpacity.value = event.height > 0 ? 0 : 1; controlsOpacity.value = event.height > 0 ? 1 : 0;
      runOnJS(setControlsOpen)(event.height > 0);
    },
  }, [active]);
  return { height, progress, bodyOpacity, controlsOpacity, controlsOpen };
}
