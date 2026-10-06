import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { completeAuthCallback } from "../../lib/features/auth/services/authCallback";

export default function AuthCallback() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const linkingUrl = Linking.useURL();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const fallbackUrl = `${Linking.createURL("/auth/callback")}?${query.toString()}`;
  const hasRouteCredentials = query.has("code") || query.has("token_hash") || query.has("access_token") || query.has("error");
  const url = Platform.OS === "web" ? window.location.href : hasRouteCredentials ? fallbackUrl : linkingUrl ?? fallbackUrl;
  const [status, setStatus] = useState("Confirmando tu cuenta...");

  useEffect(() => {
    let active = true;
    completeAuthCallback(url).then(() => {
      if (active) router.replace("/(tabs)");
    }).catch(() => {
      if (active) setStatus("No se pudo completar la autenticación. Volvé a intentar desde el registro.");
    });
    return () => { active = false; };
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FE2C55" />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 20 },
  text: { color: "#888", fontSize: 15 },
});
