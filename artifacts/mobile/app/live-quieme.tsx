import { useLocalSearchParams, router } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import Quieme from "../lib/features/live/Quieme";

export default function LiveQuiemeScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FE2C55" />
      </View>
    );
  }

  if (!roomId) {
    Alert.alert("Quiéreme", "Falta el identificador del LIVE.");
    router.back();
    return null;
  }

  return <Quieme roomId={roomId} userId={user.id} onClose={() => router.back()} />;
}
