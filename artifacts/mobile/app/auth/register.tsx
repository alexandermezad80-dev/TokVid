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

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Completá todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <View style={[styles.root, styles.successContainer]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={40} color="#fff" />
        </View>
        <Text style={styles.successTitle}>¡Cuenta creada!</Text>
        <Text style={styles.successText}>
          Revisá tu email para confirmar tu cuenta y luego iniciá sesión.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace("/auth/login")}>
          <Text style={styles.btnText}>Ir al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Registrate gratis y empezá a crear</Text>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#FE2C55" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Nombre de usuario</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="@tunombre"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

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
              placeholder="Mínimo 6 caracteres"
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

        <View style={styles.field}>
          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repetí tu contraseña"
            placeholderTextColor="#555"
            secureTextEntry={!showPass}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Crear cuenta</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tenés cuenta?</Text>
          <Link href="/auth/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}> Iniciá sesión</Text>
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
  successContainer: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 20 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  successText: { color: "#888", fontSize: 15, textAlign: "center", lineHeight: 22 },
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
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28 },
  footerText: { color: "#888", fontSize: 14 },
  footerLink: { color: "#FE2C55", fontSize: 14, fontWeight: "700" },
});
