import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, LayoutChangeEvent, Platform, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { keyboardSheetGeometry } from "../lib/keyboardSheetGeometry";
import { useGenericKeyboardHandler } from "react-native-keyboard-controller";
import { runOnJS } from "react-native-reanimated";

// Measure the actual Modal window. If Android has already resized it, the
// keyboard occlusion is zero; subtracting the keyboard twice is avoided.
export function useKeyboardSheetViewport(visible: boolean, tabBarHeight = 0) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewportRef = useRef<View>(null);
  const [viewport, setViewport] = useState({ height, top: 0 });
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const updateKeyboardHeight = useCallback((keyboardHeight: number) => {
    if (!visible) return;
    setKeyboardTop(keyboardHeight > 0 ? Math.max(0, Dimensions.get("screen").height - keyboardHeight) : null);
  }, [visible]);
  // Android can change IME height (letters -> emoji) without another RN
  // keyboardDidShow. The controller follows insets in the Modal's own window.
  useGenericKeyboardHandler({
    onMove: event => { "worklet"; runOnJS(updateKeyboardHeight)(event.height); },
    onEnd: event => { "worklet"; runOnJS(updateKeyboardHeight)(event.height); },
  }, [updateKeyboardHeight]);
  const measure = useCallback(() => {
    viewportRef.current?.measureInWindow((_x, y, _width, measuredHeight) => {
      if (measuredHeight > 0) setViewport(previous => previous.height === measuredHeight && previous.top === y ? previous : { height: measuredHeight, top: y });
    });
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = event.nativeEvent.layout.height;
    setViewport(previous => previous.height === measuredHeight ? previous : { ...previous, height: measuredHeight });
    measure();
  }, [measure]);
  useEffect(() => {
    if (!visible) { setKeyboardTop(null); return; }
    const metrics = Keyboard.metrics();
    setKeyboardTop(Keyboard.isVisible() && metrics ? metrics.screenY : null);
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow", event => {
      const screenHeight = Dimensions.get("screen").height;
      setKeyboardTop(event.endCoordinates.screenY >= screenHeight ? null : event.endCoordinates.screenY);
      measure();
    });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => { setKeyboardTop(null); measure(); });
    measure();
    return () => { show.remove(); hide.remove(); };
  }, [visible, measure]);
  return {
    viewportRef, onLayout, measure, insets,
    viewportTop: viewport.top,
    ...keyboardSheetGeometry({ viewportHeight: viewport.height, viewportTop: viewport.top,
      screenHeight: Dimensions.get("screen").height, keyboardTop, safeTop: insets.top, tabBarHeight }),
  };
}

