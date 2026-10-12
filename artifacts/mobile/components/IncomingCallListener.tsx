import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { acceptCall, rejectCall, type Call } from "../lib/features/calls/services/calls-service";
import { supabase } from "../lib/supabase";

export function IncomingCallListener() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);

  useEffect(() => {
    if (!user) { setIncomingCall(null); return; }
    const load = async () => {
      const { data } = await supabase.from("calls").select("*").eq("receiver_id", user.id).eq("status", "ringing").order("created_at", { ascending: false }).limit(1).maybeSingle();
      setIncomingCall((data as Call | null) ?? null);
    };
    void load();
    const channel = supabase.channel(`incoming-calls-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const call = payload.new as Call;
        if (call.status === "ringing") setIncomingCall(call);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const call = payload.new as Call;
        setIncomingCall((current) => current?.id === call.id && call.status === "ringing" ? call : null);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const reject = async () => {
    if (!incomingCall || busy) return; setBusy("reject");
    try { await rejectCall(incomingCall.id); setIncomingCall(null); } finally { setBusy(null); }
  };
  const accept = async () => {
    if (!incomingCall || busy) return; setBusy("accept");
    try { const call = await acceptCall(incomingCall.id); setIncomingCall(null); router.push(`/call?callId=${encodeURIComponent(call.id)}&type=${call.type}`); } catch { setIncomingCall(null); } finally { setBusy(null); }
  };
  if (!incomingCall) return null;
  const isVideo = incomingCall.type === "video";
  return <View style={styles.overlay} pointerEvents="box-none"><View style={styles.card}>
    <View style={styles.icon}><Feather name={isVideo ? "video" : "phone"} size={26} color="#fff" /></View>
    <View style={styles.info}><Text style={styles.title}>Llamada entrante</Text><Text style={styles.subtitle}>{isVideo ? "Videollamada" : "Llamada de voz"}</Text></View>
    <View style={styles.actions}>
      <TouchableOpacity style={[styles.action, styles.reject]} onPress={() => void reject()} disabled={busy !== null} accessibilityLabel="Rechazar llamada"><Feather name="phone-off" size={20} color="#fff" /></TouchableOpacity>
      <TouchableOpacity style={[styles.action, styles.accept]} onPress={() => void accept()} disabled={busy !== null} accessibilityLabel="Aceptar llamada"><Feather name="phone" size={20} color="#fff" /></TouchableOpacity>
    </View>
  </View></View>;
}
const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000, paddingHorizontal: 12, paddingTop: 54 },
  card: { minHeight: 76, borderRadius: 18, backgroundColor: "#1C1C1E", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: "#2C2C2E" },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginLeft: 12 }, title: { color: "#fff", fontSize: 15, fontWeight: "700" }, subtitle: { color: "#999", fontSize: 12, marginTop: 3 },
  actions: { flexDirection: "row", gap: 10 }, action: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  reject: { backgroundColor: "#d7193f" }, accept: { backgroundColor: "#20a464" },
});