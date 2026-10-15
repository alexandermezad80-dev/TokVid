import {StatusBar} from 'expo-status-bar';
import {palette} from '../constants/palette';
import { Stack } from "expo-router";
import React from "react";
import {StyleSheet} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import LiveEffects from "../lib/features/live/LiveEffects";

export default function LiveEffectsRoute() {
  return (
    <SafeAreaView style={styles.container}><StatusBar style="dark"/>
      <Stack.Screen options={{ title: "Efectos", headerShown: false }} />
      <LiveEffects />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: "flex-end",
    padding: 12,
  },
});

