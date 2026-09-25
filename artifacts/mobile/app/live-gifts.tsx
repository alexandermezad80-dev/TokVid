import { useLocalSearchParams } from "expo-router";
import React from "react";
import LiveGifts from "../lib/features/live/LiveGifts";

export default function LiveGiftsScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  if (!roomId) return null;
  return <LiveGifts roomId={roomId} />;
}
