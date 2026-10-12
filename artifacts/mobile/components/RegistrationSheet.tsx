import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet, Keyboard, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import GoogleButton from "./GoogleButton";
import { signInWithGoogle } from "../lib/features/auth/services/googleAuth";
import { supabase } from "../lib/supabase";
import { useKeyboardSheetViewport } from "../hooks/useKeyboardSheetViewport";

export default function RegistrationSheet({ visible, onClose, tabBarHeight, beforeAuth }: {
  visible: boolean; onClose: () => void; tabBarHeight: number; beforeAuth: () => Promise<unknown>;
}) {
  const [method, setMethod] = useState<"email" | "phone" | null>(null);
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const viewport = useKeyboardSheetViewport(visible, tabBarHeight);
  const scroll = useRef<ScrollView>(null);
  const close = () => { Keyboard.dismiss(); onClose(); };
  const revealCode = () => { if (sent && viewport.keyboardVisible) scroll.current?.scrollToEnd({ animated: true }); };
  useEffect(() => { if (sent && viewport.keyboardVisible) scroll.current?.scrollToEnd({ animated: true }); }, [sent, viewport.keyboardVisible, viewport.registrationMaxHeight]);
  useEffect(() => { if (!visible) { setMethod(null); setAddress(""); setCode(""); setSent(false); setError(""); } }, [visible]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await beforeAuth(); await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo continuar. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  };
  const submit = () => run(async () => {
    const target = address.trim();
    if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw new Error("Escribe un correo válido.");
    if (method === "phone" && !/^\+[1-9]\d{7,14}$/.test(target)) throw new Error("Incluye el código de país, por ejemplo +52.");
    if (sent) {
      if (!new RegExp(`^\\d{${method === "email" ? 8 : 6}}$`).test(code)) throw new Error(`Escribe el código de ${method === "email" ? 8 : 6} dígitos.`);
      const { error } = await supabase.auth.verifyOtp(method === "email" ? { email: target, token: code, type: "email" } : { phone: target, token: code, type: "sms" });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithOtp(method === "email" ? { email: target, options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL("/auth/callback") } } : { phone: target, options: { shouldCreateUser: true } });
      if (error) throw error;
      setSent(true);
    }
  });
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close} onShow={viewport.measure} statusBarTranslucent>
    <View ref={viewport.viewportRef} collapsable={false} onLayout={viewport.onLayout} style={[styles.backdrop, { paddingBottom: viewport.keyboardInset }]}>
      <View style={{ marginHorizontal: 16, marginBottom: viewport.registrationGap, maxHeight: viewport.registrationMaxHeight }}>
        <LinearGradient colors={["#00F2FE", "#FE0979"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.border}>
            <Pressable onPress={close} style={styles.close} accessibilityLabel="Cerrar registro" accessibilityRole="button"><Feather name="x" size={22} color="#fff" /></Pressable>
          <ScrollView ref={scroll} style={[styles.sheet, { maxHeight: Math.max(0, viewport.registrationMaxHeight - 2) }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onContentSizeChange={revealCode}>
            <View style={styles.handle} />
            <Text style={styles.title}>Únete a TokVid</Text>
            <Text style={styles.subtitle}>Conecta y descubre más.</Text>
            {!method ? <>
              <GoogleButton loading={busy} onPress={() => run(async () => { const result = await signInWithGoogle(); if (result.error && result.error !== "cancel") throw new Error(result.error); })} />
              <Text style={styles.or}>o continúa con</Text>
              <Pressable disabled={busy} onPress={() => setMethod("email")} style={styles.option}><Feather name="mail" size={20} color="#00F2FE" /><Text style={styles.optionText}>Correo electrónico</Text><Feather name="chevron-right" size={18} color="#aaa" /></Pressable>
              <Pressable disabled={busy} onPress={() => setMethod("phone")} style={styles.option}><Feather name="smartphone" size={20} color="#FE0979" /><Text style={styles.optionText}>Teléfono</Text><Feather name="chevron-right" size={18} color="#aaa" /></Pressable>
            </> : <>
              <Pressable onPress={() => { setMethod(null); setSent(false); setError(""); }}><Text style={styles.link}>‹ Otros métodos</Text></Pressable>
              <Text style={styles.optionText}>{sent ? "Introduce tu código" : method === "email" ? "Tu correo electrónico" : "Tu número de teléfono"}</Text>
              <TextInput accessibilityLabel={method === "email" ? "Correo electrónico" : "Teléfono con código de país"} style={styles.input} value={address} onChangeText={setAddress} editable={!sent && !busy} autoCapitalize="none" autoCorrect={false} keyboardType={method === "email" ? "email-address" : "phone-pad"} placeholder={method === "email" ? "nombre@correo.com" : "+52…"} placeholderTextColor="#888" />
              {sent && <TextInput onFocus={revealCode} accessibilityLabel="Código de verificación" style={styles.input} value={code} onChangeText={text => setCode(text.replace(/\D/g, ""))} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={method === "email" ? 8 : 6} placeholder={method === "email" ? "8 dígitos" : "6 dígitos"} placeholderTextColor="#888" />}
              <Pressable disabled={busy} onPress={submit} style={styles.submit}><Text style={styles.optionText}>{busy ? "Conectando…" : sent ? "Verificar y continuar" : "Enviar código"}</Text></Pressable>
              {sent && <Pressable disabled={busy} onPress={() => { setSent(false); setCode(""); }}><Text style={styles.link}>Cambiar dirección o reenviar</Text></Pressable>}
            </>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Text style={styles.footer}>Google, correo o teléfono. Tú eliges.</Text>
          </ScrollView>
        </LinearGradient>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  border: { padding: 1, borderRadius: 28 }, sheet: { backgroundColor: "#15151B", borderRadius: 27 }, content: { padding: 24, gap: 14 },
  close: { position: "absolute", right: 12, top: 12, width: 48, height: 48, alignItems: "center", justifyContent: "center", zIndex: 2 }, handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#555", alignSelf: "center", marginBottom: 8 },
  title: { color: "#fff", fontSize: 27, fontWeight: "800", textAlign: "center" }, subtitle: { color: "#aaa", textAlign: "center", marginBottom: 10 },
  or: { color: "#999", textAlign: "center", fontSize: 12 }, option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 84, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#393941" }, optionText: { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1 },
  input: { borderWidth: 1, borderColor: "#555", borderRadius: 12, color: "#fff", padding: 14, fontSize: 17 }, submit: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#00F2FE", alignItems: "center" }, link: { color: "#00F2FE", paddingVertical: 6 }, error: { color: "#ff8dab", fontSize: 13 }, footer: { color: "#888", fontSize: 11, textAlign: "center", marginTop: 4 },
});
