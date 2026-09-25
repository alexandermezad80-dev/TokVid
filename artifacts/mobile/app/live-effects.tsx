import { Stack } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import LiveEffects from "../lib/features/live/LiveEffects";

export default function LiveEffectsRoute() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Efectos", headerShown: false }} />
      <LiveEffects />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "flex-end",
    padding: 12,
  },
});
