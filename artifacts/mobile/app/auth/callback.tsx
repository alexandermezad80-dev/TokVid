import { useRegistration } from "../../context/RegistrationContext";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { completeAuthCallback } from "../../lib/features/auth/services/authCallback";
import { recordAuthDiagnostic, rememberAuthSecrets, rememberAuthUrl } from "../../lib/authDiagnostics";

export default function AuthCallback() {
  recordAuthDiagnostic("callback.render");
  const { getAuthDestination } = useRegistration();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  rememberAuthSecrets(params);
  const linkingUrl = Linking.useURL();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const fallbackUrl = `${Linking.createURL("/auth/callback")}?${query.toString()}`;
  const hasRouteCredentials = query.has("code") || query.has("token_hash") || query.has("access_token") || query.has("error");
  const url = Platform.OS === "web" ? window.location.href : hasRouteCredentials ? fallbackUrl : linkingUrl ?? fallbackUrl;
  rememberAuthUrl(url);
  recordAuthDiagnostic("callback.ready");
  const [status, setStatus] = useState("Confirmando tu cuenta...");

  useEffect(() => {
    let active = true;
    recordAuthDiagnostic("callback.effect");
    completeAuthCallback(url).then(() => {
      recordAuthDiagnostic("callback.session.ready");
      if (active) { recordAuthDiagnostic("callback.navigate"); router.replace(getAuthDestination()); }
    }).catch(() => {
      recordAuthDiagnostic("callback.failed");
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
