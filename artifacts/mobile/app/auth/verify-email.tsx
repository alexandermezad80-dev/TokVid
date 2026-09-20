import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function VerifyEmailScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === "string" ? emailParam : "";
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) {
      setMessage("Volvé al registro para indicar tu email.");
      return;
    }

    setMessage(null);
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    setMessage(
      error
        ? error.message
        : "Te enviamos nuevamente el correo de confirmación."
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Feather name="mail" size={34} color="#fff" />
        </View>

        <Text style={styles.logo}>TokVid</Text>
        <Text style={styles.title}>Revisa tu correo</Text>
        <Text style={styles.text}>
          Te enviamos un correo para confirmar tu cuenta.
          {email ? ` Revisa ${email}.` : ""}
        </Text>
        <Text style={styles.hint}>
          Abre el correo y sigue el enlace de confirmación. Cuando termine la
          confirmación, TokVid continuará con tu sesión.
        </Text>

        {message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity
          style={[styles.button, resending && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reenviar correo</Text>
          )}
        </TouchableOpacity>

        <Pressable onPress={() => router.replace("/auth/login")}>
          <Text style={styles.link}>Volver al inicio de sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  logo: {
    color: "#FE2C55",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 28,
  },
  title: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  text: {
    color: "#ddd",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  hint: {
    color: "#888",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 22,
  },
  message: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    width: "100%",
    backgroundColor: "#FE2C55",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  link: {
    color: "#FE2C55",
    fontSize: 14,
    fontWeight: "700",
  },
});
