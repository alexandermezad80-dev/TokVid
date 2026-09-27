import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { FollowProvider } from "../context/FollowContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { IncomingCallListener } from "../components/IncomingCallListener";


const queryClient = new QueryClient();

function PushNotificationSetup() {
  const { user } = useAuth();
  usePushNotifications(user?.id);
  return null;
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const onboardingCompleted = session?.user?.user_metadata?.onboarding_completed === true;

  useEffect(() => {
    if (!loading && session && !onboardingCompleted) {
      router.replace("/auth/onboarding-profile");
    }
  }, [loading, onboardingCompleted, session]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FE2C55" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session && onboardingCompleted ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="story-viewer" options={{ presentation: "fullScreenModal", animation: "fade" }} />
          <Stack.Screen name="story-create" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="edit-profile" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="user-profile" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="call" options={{ presentation: "fullScreenModal", animation: "fade" }} />
          <Stack.Screen name="live-room" options={{ presentation: "fullScreenModal", animation: "fade" }} />
          <Stack.Screen name="chat" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="tag" options={{ animation: "slide_from_right" }} />
        </>
      ) : (
        <Stack.Screen name="auth" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // Do not block the app behind a custom splash. Expo hides the native splash
  // automatically once the root view is mounted; this prevents the blue splash
  // from remaining on screen when a JS module fails during startup.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0F", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: "#00F2EA", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 0, height: 0, borderTopWidth: 11, borderBottomWidth: 11, borderLeftWidth: 18, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#0A0A0F", marginLeft: 4 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
            <KeyboardProvider>
              <AuthProvider>
                <FollowProvider>
                  <NotificationsProvider>
                    <PushNotificationSetup />
                    <IncomingCallListener />
                    <StatusBar style="light" />
                    <RootLayoutNav />
                  </NotificationsProvider>
                </FollowProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}