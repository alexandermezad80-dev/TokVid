import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {palette} from '../constants/palette';
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import TapTap from "../lib/features/live/TapTap";
import { useAuth } from "../context/AuthContext";

export default function LiveTapTapRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();
  const insets=useSafeAreaInsets();

  if (!roomId || !user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.input, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: palette.text }}>LIVE room y sesión requeridos.</Text>
      </View>
    );
  }

  return <View style={{flex:1,backgroundColor:palette.background,paddingTop:insets.top,paddingBottom:insets.bottom}}><StatusBar style="dark"/><TapTap roomId={roomId} userId={user.id} /></View>;
}

