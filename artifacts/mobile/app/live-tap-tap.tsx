import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import TapTap from "../lib/features/live/TapTap";
import { useAuth } from "../context/AuthContext";

export default function LiveTapTapRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();

  if (!roomId || !user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff" }}>LIVE room y sesión requeridos.</Text>
      </View>
    );
  }

  return <TapTap roomId={roomId} userId={user.id} />;
}
