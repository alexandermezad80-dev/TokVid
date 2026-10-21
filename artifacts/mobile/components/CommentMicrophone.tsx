import React, { useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
export default function CommentMicrophone({ active, size }: { active: boolean; size: number }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = active ? withRepeat(withTiming(.5, { duration: 700 }), -1, true) : 1;
    return () => cancelAnimation(opacity);
  }, [active]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={pulse}><Feather name="mic" size={size} color={active ? "#4682B4" : "#3A3F47"} /></Animated.View>;
}
