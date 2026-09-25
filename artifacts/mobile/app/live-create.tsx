import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Mode = "solo" | "guests";

export default function LiveCreateScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("solo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const createLive = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("live_create_room", {
        p_mode: mode, p_title: title.trim() || null,
        p_description: description.trim() || null, p_metadata: {},
      });
      if (error) throw new Error(error.message);
      const roomId = typeof data === "string" ? data : data?.room_id ?? data?.id ?? data?.[0]?.room_id ?? data?.[0]?.id;
      if (!roomId) throw new Error("El servidor creó el LIVE pero no devolvió su identificador.");
      router.replace(`/live-room?roomId=${encodeURIComponent(roomId)}`);
    } catch (error) {
      Alert.alert("No se pudo crear el LIVE", error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally { setCreating(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={23} color="#fff" /></Pressable><View><Text style={styles.title}>Crear LIVE</Text><Text style={styles.subtitle}>Inicia una transmisión en vivo</Text></View></View>
      <View style={styles.body}>
        <View style={styles.hero}><View style={styles.heroIcon}><Feather name="radio" size={34} color="#fff" /></View><Text style={styles.heroTitle}>Tu LIVE empieza aquí</Text><Text style={styles.heroText}>Elige quién puede participar y luego entrarás directamente a tu sala.</Text></View>
        <Text style={styles.sectionTitle}>Tipo de LIVE</Text>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode("solo")} style={[styles.modeCard, mode === "solo" && styles.modeActive]}><Feather name="user" size={22} color="#fff" /><Text style={styles.modeTitle}>Solo</Text><Text style={styles.modeText}>Solo tú como anfitrión.</Text></Pressable>
          <Pressable onPress={() => setMode("guests")} style={[styles.modeCard, mode === "guests" && styles.modeActive]}><Feather name="users" size={22} color="#fff" /><Text style={styles.modeTitle}>Guests</Text><Text style={styles.modeText}>Hasta 11 Guests activos.</Text></Pressable>
        </View>
        <Text style={styles.sectionTitle}>Información</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Título del LIVE" placeholderTextColor="#666" maxLength={100} style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Descripción (opcional)" placeholderTextColor="#666" maxLength={300} multiline style={[styles.input, styles.description]} />
        <Pressable onPress={() => void createLive()} disabled={creating} style={[styles.createButton, creating && styles.disabled]}>{creating ? <ActivityIndicator color="#fff" /> : <><Feather name="radio" size={20} color="#fff" /><Text style={styles.createText}>Iniciar LIVE</Text></>}</Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#171717" },
  back: { padding: 7, marginRight: 8 }, title: { color: "#fff", fontSize: 20, fontWeight: "800" }, subtitle: { color: "#777", fontSize: 12, marginTop: 2 },
  body: { padding: 18, gap: 14 }, hero: { alignItems: "center", paddingVertical: 18 }, heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FE2C55", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 21, fontWeight: "800", marginTop: 12 }, heroText: { color: "#777", fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 6 },
  sectionTitle: { color: "#aaa", fontSize: 13, fontWeight: "800", marginTop: 5 }, modeRow: { flexDirection: "row", gap: 10 },
  modeCard: { flex: 1, minHeight: 116, borderRadius: 16, backgroundColor: "#111", borderWidth: 1, borderColor: "#242424", padding: 14, gap: 6 }, modeActive: { borderColor: "#FE2C55", backgroundColor: "#181012" },
  modeTitle: { color: "#fff", fontSize: 16, fontWeight: "800" }, modeText: { color: "#777", fontSize: 12, lineHeight: 17 },
  input: { minHeight: 48, borderRadius: 13, backgroundColor: "#111", borderWidth: 1, borderColor: "#242424", color: "#fff", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, description: { minHeight: 90, textAlignVertical: "top" },
  createButton: { minHeight: 54, borderRadius: 15, backgroundColor: "#FE2C55", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 }, createText: { color: "#fff", fontSize: 16, fontWeight: "800" }, disabled: { opacity: 0.6 },
});