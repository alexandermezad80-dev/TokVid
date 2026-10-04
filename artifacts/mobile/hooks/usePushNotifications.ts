import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || Platform.OS === "web") return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      setExpoPushToken(token);
      await supabase
        .from("profile_private")
        .update({ push_token: token })
        .eq("id", userId);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Notification received while app is in foreground
    });

    const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
      if (handledResponseId.current === response.notification.request.identifier) return;
      handledResponseId.current = response.notification.request.identifier;

      const data = response.notification.request.content.data as Record<string, unknown>;
      const { router } = await import("expo-router");

      if (data.type === "call" && typeof data.callId === "string") {
        const callType = data.callType === "video" ? "video" : "voice";
        router.push(`/call?callId=${encodeURIComponent(data.callId)}&type=${callType}`);
        return;
      }

      if (data.type !== "message" || typeof data.conversationId !== "string") return;

      const conversationId = data.conversationId;
      const otherUserId = typeof data.otherUserId === "string" ? data.otherUserId : "";
      const otherUsername = typeof data.otherUsername === "string" ? data.otherUsername : "Usuario";
      const otherAvatar = typeof data.otherAvatar === "string" ? data.otherAvatar : "";

      router.push(
        `/chat?conversationId=${conversationId}&otherUserId=${otherUserId}&otherUsername=${encodeURIComponent(otherUsername)}&otherAvatar=${encodeURIComponent(otherAvatar)}`
      );
    };

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    let coldStartTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      coldStartTimer = null;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) void handleNotificationResponse(response);
      });
    }, 500);

    return () => {
      if (coldStartTimer) clearTimeout(coldStartTimer);
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FE2C55",
      });
    }

    return data;
  } catch {
    return null;
  }
}
