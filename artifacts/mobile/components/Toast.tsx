import {palette} from '../constants/palette';
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

interface Props {
  visible: boolean;
  message: string;
}

export default function Toast({ visible, message }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);

  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => { shown.current = false; });
    }
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  text: { fontFamily: "Inter_500Medium",
    color: palette.text,
    fontSize: 14,
    fontWeight: "normal",
  },
});

