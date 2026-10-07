import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, findNodeHandle } from "react-native";
import { commentPopoverGeometry } from "../lib/commentPopoverGeometry";

export interface CommentAction {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export default function CommentActionsPopover({ placement, actions, onClose, onContentHeight }: {
  placement: ReturnType<typeof commentPopoverGeometry>;
  actions: CommentAction[];
  onClose: () => void;
  onContentHeight: (height: number) => void;
}) {
  const first = useRef<View>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = findNodeHandle(first.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return <View style={styles.overlay}>
    <Pressable accessibilityRole="button" accessibilityLabel="Cancelar opciones" onPress={onClose} style={styles.backdrop} />
    <View accessibilityViewIsModal importantForAccessibility="yes" style={[styles.position, { left: placement.left, top: placement.top, width: placement.width }]}>
      <View pointerEvents="none" style={[styles.tip, { left: placement.tip, ...(placement.side === "above" ? { bottom: -5 } : { top: -5 }) }]} />
      <View style={styles.menu}>
        <BlurView pointerEvents="none" intensity={18} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <LinearGradient pointerEvents="none" colors={["rgba(0,242,254,0.09)", "rgba(254,9,121,0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <ScrollView style={{ maxHeight: placement.maxHeight }} contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled" onContentSizeChange={(_width, height) => onContentHeight(height)}>
          {actions.map((action, index) => <Pressable key={action.key} ref={index === 0 ? first : undefined} accessibilityRole="button" accessibilityState={{ disabled: !!action.disabled }} disabled={action.disabled} onPress={action.onPress} style={({ pressed }) => [styles.action, index > 0 && styles.divider, pressed && styles.pressed, action.disabled && styles.disabled]}>
            <Feather name={action.icon} size={18} color={action.destructive ? "#ff8dab" : "#e8e8ee"} />
            <Text style={[styles.label, action.destructive && styles.destructive]}>{action.title}</Text>
          </Pressable>)}
        </ScrollView>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.16)" },
  position: { position: "absolute", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  menu: { backgroundColor: "rgba(30,31,40,0.94)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", overflow: "hidden" },
  content: { paddingVertical: 4 },
  action: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.09)" },
  label: { color: "#f2f2f6", fontSize: 14, lineHeight: 20, flex: 1 },
  destructive: { color: "#ff8dab" },
  pressed: { backgroundColor: "rgba(255,255,255,0.08)" },
  disabled: { opacity: 0.45 },
  tip: { position: "absolute", width: 11, height: 11, transform: [{ rotate: "45deg" }], backgroundColor: "#242630", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
});
