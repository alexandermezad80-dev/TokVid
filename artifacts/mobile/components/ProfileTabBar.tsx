import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { referenceVisual as v } from "../constants/referenceVisual";

/** The visitor can leave a profile through the same five existing routes. */
export default function ProfileTabBar() {
  const insets = useSafeAreaInsets();
  return <View style={{ backgroundColor: "#FFFFFF", paddingBottom: insets.bottom }}>
    <View style={{ height: 56, flexDirection: "row", borderTopWidth: 1, borderTopColor: v.inboxLine }}>
      {([
        ["Inicio", "home", "/(tabs)"], ["Amigos", "users", "/(tabs)/friends"],
        ["Crear", "plus", "/(tabs)/create"], ["Mensajes", "message-circle", "/(tabs)/inbox"],
        ["Perfil", "user", "/(tabs)/profile"],
      ] as const).map(([label, icon, route]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
        onPress={() => router.dismissTo(route)} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
        {label === "Crear" ? <View style={{ width: 49, height: 30, borderRadius: 9, padding: 1, overflow: "hidden", marginBottom: 4 }}>
          <LinearGradient colors={v.outline} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={StyleSheet.absoluteFill}/>
          <LinearGradient colors={v.createFill} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={{ flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
            <Feather name="plus" size={24} color="#FFFFFF"/>
          </LinearGradient>
        </View> : <><Feather name={icon} size={22} color={v.label}/><Text allowFontScaling={false} style={{ fontFamily: "Inter_400Regular", color: v.label, fontSize: 10 }}>{label}</Text></>}
      </Pressable>)}
    </View>
  </View>;
}
