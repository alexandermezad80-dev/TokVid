import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Completá los campos de email y contraseña.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>TokVid</Text>
        <Text style={styles.title}>Iniciá sesión</Text>
        <Text style={styles.subtitle}>Ingresá con tu cuenta para continuar</Text>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#FE2C55" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#555"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <Pressable onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
              <Feather name={showPass ? "eye-off" : "eye"} size={18} color="#888" />
            </Pressable>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tenés cuenta?</Text>
          <Link href="/auth/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}> Registrate</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  container: { paddingHorizontal: 28, flexGrow: 1 },
  logo: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FE2C55",
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 32,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#888", fontSize: 14, marginBottom: 28 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(254,44,85,0.1)",
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: "#FE2C55", fontSize: 13, flex: 1 },
  field: { marginBottom: 18 },
  label: { color: "#aaa", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  passRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    paddingRight: 12,
    overflow: "hidden",
  },
  eyeBtn: { padding: 4 },
  btn: {
    backgroundColor: "#FE2C55",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 28,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#2C2C2E" },
  dividerText: { color: "#555", fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: "#888", fontSize: 14 },
  footerLink: { color: "#FE2C55", fontSize: 14, fontWeight: "700" },
});
