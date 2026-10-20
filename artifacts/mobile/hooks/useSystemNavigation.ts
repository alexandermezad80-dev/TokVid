import { useEffect } from "react";
import { NativeModules, Platform } from "react-native";

const surfaces: { token: object; color: string; darkIcons: boolean }[] = [];
export function refreshSystemNavigation() {
  const surface = surfaces[surfaces.length - 1];
  if (surface && Platform.OS === "android") {
    NativeModules.TokVidChatTools?.setNavigationAppearance?.(surface.color, surface.darkIcons);
  }
}

/** A modal temporarily owns the system strip; closing restores its screen. */
export function useSystemNavigation(color: string, darkIcons: boolean, active = true) {
  useEffect(() => {
    if (!active) return;
    const token = {};
    surfaces.push({ token, color, darkIcons }); refreshSystemNavigation();
    return () => {
      const index = surfaces.findIndex(surface => surface.token === token);
      if (index >= 0) surfaces.splice(index, 1);
      refreshSystemNavigation();
    };
  }, [color, darkIcons, active]);
}
