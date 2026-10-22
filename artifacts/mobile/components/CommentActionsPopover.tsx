import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, findNodeHandle } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";

export interface CommentAction {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export default function CommentActionsPopover({ actions, onClose, safeBottom, safeLeft, safeRight, maxHeight }: {
  actions: CommentAction[]; onClose: () => void;
  safeBottom: number; safeLeft: number; safeRight: number; maxHeight: number;
}) {
  const first = useRef<View>(null);
  const groups = [actions.filter(action => action.destructive), actions.filter(action => !action.destructive)].filter(group => group.length);
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = findNodeHandle(first.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 220);
    return () => clearTimeout(timer);
  }, []);
  return <View style={styles.overlay}>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones" onPress={onClose} style={styles.backdrop} />
    <Animated.View entering={SlideInDown.duration(200)} accessibilityViewIsModal importantForAccessibility="yes"
      style={[styles.sheet, { paddingBottom: Math.max(12, safeBottom), paddingLeft: 12 + safeLeft, paddingRight: 12 + safeRight, maxHeight }]}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {groups.map((group, groupIndex) => <View key={groupIndex} style={styles.group}>
          {group.map((action, index) => <Pressable key={action.key} ref={groupIndex === 0 && index === 0 ? first : undefined}
            accessibilityRole="button" accessibilityState={{ disabled: !!action.disabled }} disabled={action.disabled}
            onPress={action.onPress} style={({ pressed }) => [styles.action, action.destructive && index > 0 && styles.separator, pressed && styles.pressed, action.disabled && styles.disabled]}>
            <Feather name={action.icon} size={24} color="#131313" />
            <Text style={styles.label}>{action.title}</Text>
          </Pressable>)}
        </View>)}
      </ScrollView>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 18, backgroundColor: "#F5F5F5", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  content: { gap: 12 }, group: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden" },
  action: { minHeight: 51, paddingVertical: 13, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 16 },
  label: { fontFamily: "Inter_300Light", color: "#131313", fontSize: 15, lineHeight: 25, flex: 1 },
  pressed: { backgroundColor: "#F0EFEC" }, disabled: { opacity: 0.45 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E5E5" },
});
