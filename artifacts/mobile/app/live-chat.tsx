import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {palette} from '../constants/palette';
import { useLocalSearchParams, router } from "expo-router";
import React from "react";
import { Alert, View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import LiveChat from "../lib/features/live/LiveChat";

export default function LiveChatScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();
  const insets=useSafeAreaInsets();

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.input, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FE2C55" />
      </View>
    );
  }

  if (!roomId) {
    Alert.alert("Live Chat", "Falta el identificador del LIVE.");
    router.back();
    return null;
  }

  return <View style={{flex:1,backgroundColor:palette.header[0],paddingTop:insets.top,paddingBottom:insets.bottom}}><StatusBar style="light"/><LiveChat roomId={roomId} userId={user.id} onClose={() => router.back()} /></View>;
}

