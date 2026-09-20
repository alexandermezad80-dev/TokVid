import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>();
  const [status, setStatus] = useState("Confirmando tu cuenta...");

  useEffect(() => {
    const handle = async () => {
      if (params.error) {
        setStatus(`Error: ${params.error_description ?? params.error}`);
        setTimeout(() => router.replace("/auth/login"), 2500);
        return;
      }

      if (params.token_hash && params.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: params.type as "signup" | "email",
        });
        if (error) {
          setStatus("No se pudo confirmar tu correo.");
          setTimeout(() => router.replace("/auth/login"), 2500);
          return;
        }
        router.replace("/auth/onboarding-profile");
        return;
      }

      if (params.code) {
        const href = typeof window !== "undefined" ? window.location.href : "";
        const { error } = await supabase.auth.exchangeCodeForSession(href);
        if (error) {
          setStatus("No se pudo completar la autenticación.");
          setTimeout(() => router.replace("/auth/login"), 2500);
          return;
        }
      }

      router.replace("/auth/onboarding-profile");
    };

    handle();
  }, [params.code, params.error, params.error_description, params.token_hash, params.type]);

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
