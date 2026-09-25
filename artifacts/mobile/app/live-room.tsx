import React from "react";
import { useLocalSearchParams } from "expo-router";
import LiveRoom from "../lib/features/live/LiveRoom";

export default function LiveRoomRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();

  if (!roomId) return null;

  return <LiveRoom />;
}
