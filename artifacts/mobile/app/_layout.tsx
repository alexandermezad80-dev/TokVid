import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreenComponent } from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { FollowProvider } from "../context/FollowContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { IncomingCallListener } from "../components/IncomingCallListener";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function PushNotificationSetup() {
  const { user } = useAuth();
  usePushNotifications(user?.id);
  return null;
}

function RootLayoutNav() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FE2C55" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="story-viewer"
            options={{
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="story-create"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="user-profile"
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="call"
            options={{
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="chat"
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="tag"
            options={{
              animation: "slide_from_right",
            }}
          />
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (!fontsLoaded && !fontError) return null;

  if (showSplash) {
    return <SplashScreenComponent onFinish={handleSplashFinish} />;
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
