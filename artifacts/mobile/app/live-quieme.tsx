import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {palette} from '../constants/palette';
import { useLocalSearchParams, router } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import Quieme from "../lib/features/live/Quieme";

export default function LiveQuiemeScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();
  const insets=useSafeAreaInsets();

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" }}><StatusBar style="dark"/>
        <ActivityIndicator color="#FE2C55" />
      </View>
    );
  }

  if (!roomId) {
    Alert.alert("Quiéreme", "Falta el identificador del LIVE.");
    router.back();
    return null;
  }

  return <View style={{flex:1,backgroundColor:palette.background,paddingTop:insets.top,paddingBottom:insets.bottom}}><StatusBar style="dark"/><Quieme roomId={roomId} userId={user.id} onClose={() => router.back()} /></View>;
}

