import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { signInWithGoogle } from "../hooks/useGoogleAuth";

export type PendingAuthAction = "like" | "comment" | "follow" | "favorite" | "profile" | "generic";

type PendingActionCallback = () => void | Promise<void>;

interface SeamlessAuthContextValue {
  openSeamlessAuth: (action?: PendingAuthAction, onComplete?: PendingActionCallback) => void;
  closeSeamlessAuth: () => void;
}

const SeamlessAuthContext = createContext<SeamlessAuthContextValue | null>(null);

function actionLabel(action: PendingAuthAction | null) {
  switch (action) {
    case "like": return "dar Me gusta";
    case "comment": return "comentar";
    case "follow": return "seguir";
    case "favorite": return "guardar";
    case "profile": return "ver tu perfil";
    default: return "continuar";
  }
}

export function SeamlessAuthProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAuthAction | null>(null);
  const [onComplete, setOnComplete] = useState<PendingActionCallback | null>(null);
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"method" | "code">("method");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setVisible(false);
    setPendingAction(null);
    setOnComplete(null);
    setIdentifier("");
    setCode("");
    setStep("method");
    setLoading(false);
    setError("");
  };

  const openSeamlessAuth = (action: PendingAuthAction = "generic", callback?: PendingActionCallback) => {
    setPendingAction(action);
    setOnComplete(() => callback ?? null);
    setMethod("email");
    setIdentifier("");
    setCode("");
    setStep("method");
    setError("");
    setVisible(true);
  };

  const closeSeamlessAuth = () => reset();

  const finish = async () => {
    const callback = onComplete;
    const action = pendingAction;
    reset();

    if (callback) {
      await callback();
      return;
    }

    if (action === "profile") {
      return;
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.error && result.error !== "cancel") {
      setError(result.error);
      return;
    }
    if (!result.error) {
      await finish();
    }
  };

  const sendCode = async () => {
    const value = identifier.trim();
    if (!value) {
      setError(method === "email" ? "Ingresá tu correo electrónico." : "Ingresá tu número de teléfono.");
      return;
    }

    if (method === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
      setError("Ingresá un correo electrónico válido.");
      return;
    }

    if (method === "phone" && !/^\+?[0-9]{8,15}$/.test(value.replace(/[\s()-]/g, ""))) {
      setError("Usá un número con código de país, por ejemplo +50212345678.");
      return;
    }

    setError("");
    setLoading(true);

    const payload = method === "email"
      ? { email: value, options: { shouldCreateUser: true } }
      : { phone: value.replace(/[\s()-]/g, ""), options: { shouldCreateUser: true } };

    const { error: otpError } = await supabase.auth.signInWithOtp(payload as any);
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep("code");
  };

  const verifyCode = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError("Ingresá el código de 6 dígitos.");
      return;
    }

    setError("");
    setLoading(true);

    const cleanIdentifier = identifier.trim();
    const result = method === "email"
      ? await supabase.auth.verifyOtp({ email: cleanIdentifier, token, type: "email" })
      : await supabase.auth.verifyOtp({ phone: cleanIdentifier.replace(/[\s()-]/g, ""), token, type: "sms" });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await finish();
  };

  const value = useMemo(
    () => ({ openSeamlessAuth, closeSeamlessAuth }),
    []
  );

  return (
    <SeamlessAuthContext.Provider value={value}>
      {children}

      <Modal visible={visible} transparent animationType="slide" onRequestClose={closeSeamlessAuth}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSeamlessAuth} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.handle} />
            <Pressable style={styles.close} onPress={closeSeamlessAuth}>
              <Feather name="x" size={22} color="#fff" />
            </Pressable>

            <Text style={styles.title}>Continuá en TokVid</Text>
            <Text style={styles.subtitle}>
              Registrate o iniciá sesión sin contraseña para {actionLabel(pendingAction)}.
            </Text>

            {step === "method" ? (
              <>
                <Pressable style={styles.google} onPress={handleGoogle} disabled={loading}>
                  {loading ? <ActivityIndicator color="#111" /> : <><Feather name="chrome" size={20} color="#111" /><Text style={styles.googleText}>Continuar con Google</Text></>}
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.line} />
                </View>

                <View style={styles.switchRow}>
                  <Pressable onPress={() => setMethod("email")} style={[styles.switch, method === "email" && styles.switchActive]}>
                    <Text style={[styles.switchText, method === "email" && styles.switchTextActive]}>Email</Text>
                  </Pressable>
                  <Pressable onPress={() => setMethod("phone")} style={[styles.switch, method === "phone" && styles.switchActive]}>
                    <Text style={[styles.switchText, method === "phone" && styles.switchTextActive]}>Teléfono</Text>
                  </Pressable>
                </View>

                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={method === "email" ? "tu@email.com" : "+502 1234 5678"}
                  placeholderTextColor="#666"
                  keyboardType={method === "email" ? "email-address" : "phone-pad"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />

                <Pressable style={styles.primary} onPress={sendCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="#0A0A0F" /> : <Text style={styles.primaryText}>Enviar código</Text>}
                </Pressable>

                <Text style={styles.note}>No pedimos contraseña, intereses, foto ni nombre de usuario.</Text>
              </>
            ) : (
              <>
                <Text style={styles.codeHint}>Enviamos un código de 6 dígitos a {identifier.trim()}.</Text>
                <TextInput
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={[styles.input, styles.codeInput]}
                />
                <Pressable style={styles.primary} onPress={verifyCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="#0A0A0F" /> : <Text style={styles.primaryText}>Verificar y continuar</Text>}
                </Pressable>
                <Pressable onPress={() => setStep("method")} style={styles.backLink}>
                  <Text style={styles.backText}>Cambiar correo o teléfono</Text>
                </Pressable>
              </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        </View>
      </Modal>
    </SeamlessAuthContext.Provider>
  );
}

export function useSeamlessAuth() {
  const ctx = useContext(SeamlessAuthContext);
  if (!ctx) throw new Error("useSeamlessAuth must be used within SeamlessAuthProvider");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0F0F14", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 10 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#555", alignSelf: "center", marginBottom: 18 },
  close: { position: "absolute", right: 16, top: 14, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#1C1C22" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#9B9BA5", fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 20 },
  google: { minHeight: 52, borderRadius: 14, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  googleText: { color: "#111", fontSize: 15, fontWeight: "800" },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: "#292930" },
  dividerText: { color: "#666", fontSize: 13 },
  switchRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  switch: { flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center", backgroundColor: "#18181F" },
  switchActive: { backgroundColor: "#00F2FE" },
  switchText: { color: "#999", fontWeight: "700" },
  switchTextActive: { color: "#0A0A0F" },
  input: { minHeight: 52, borderRadius: 14, backgroundColor: "#18181F", borderWidth: 1, borderColor: "#2B2B34", paddingHorizontal: 16, color: "#fff", fontSize: 16, marginBottom: 12 },
  codeInput: { textAlign: "center", letterSpacing: 8, fontSize: 24, fontWeight: "800" },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: "#00F2FE", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0A0A0F", fontSize: 15, fontWeight: "900" },
  note: { color: "#666", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 12 },
  codeHint: { color: "#9B9BA5", fontSize: 14, marginBottom: 12 },
  backLink: { alignItems: "center", paddingVertical: 14 },
  backText: { color: "#00F2FE", fontWeight: "700" },
  error: { color: "#FE0979", fontSize: 13, lineHeight: 18, marginTop: 12, textAlign: "center" },
});
