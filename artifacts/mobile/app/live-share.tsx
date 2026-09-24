import React from "react";
import { useLocalSearchParams } from "expo-router";
import ShareLive from "../lib/features/live/ShareLive";

export default function LiveShareRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();

  if (!roomId) return null;

  return <ShareLive />;
}
