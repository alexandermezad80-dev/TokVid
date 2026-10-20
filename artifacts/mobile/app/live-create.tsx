import HeaderSurface from '../components/reference/HeaderSurface';
import {palette} from '../constants/palette';
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
      <HeaderSurface safeTop style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={23} color="#fff" /></Pressable><View><Text style={styles.title}>Crear LIVE</Text><Text style={styles.subtitle}>Inicia una transmisión en vivo</Text></View></HeaderSurface>
      <View style={styles.body}>
        <View style={styles.hero}><View style={styles.heroIcon}><Feather name="radio" size={34} color="#fff" /></View><Text style={styles.heroTitle}>Tu LIVE empieza aquí</Text><Text style={styles.heroText}>Elige quién puede participar y luego entrarás directamente a tu sala.</Text></View>
        <Text style={styles.sectionTitle}>Tipo de LIVE</Text>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode("solo")} style={[styles.modeCard, mode === "solo" && styles.modeActive]}><Feather name="user" size={22} color={palette.text} /><Text style={styles.modeTitle}>Solo</Text><Text style={styles.modeText}>Solo tú como anfitrión.</Text></Pressable>
          <Pressable onPress={() => setMode("guests")} style={[styles.modeCard, mode === "guests" && styles.modeActive]}><Feather name="users" size={22} color={palette.text} /><Text style={styles.modeTitle}>Guests</Text><Text style={styles.modeText}>Hasta 11 Guests activos.</Text></Pressable>
        </View>
        <Text style={styles.sectionTitle}>Información</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Título del LIVE" placeholderTextColor={palette.muted} maxLength={100} style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Descripción (opcional)" placeholderTextColor={palette.muted} maxLength={300} multiline style={[styles.input, styles.description]} />
        <Pressable onPress={() => void createLive()} disabled={creating} style={[styles.createButton, creating && styles.disabled]}>{creating ? <ActivityIndicator color="#fff" /> : <><Feather name="radio" size={20} color="#fff" /><Text style={styles.createText}>Iniciar LIVE</Text></>}</Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.border },
  back: { padding: 7, marginRight: 8 }, title: { fontFamily: "Inter_500Medium", color: palette.headerText, fontSize: 20, fontWeight: "normal" }, subtitle: { fontFamily: "Inter_400Regular", color: palette.headerSecondary, fontSize: 12, marginTop: 2 },
  body: { padding: 18, gap: 14 }, hero: { alignItems: "center", paddingVertical: 18 }, heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: palette.button, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: "Inter_500Medium", color: palette.text, fontSize: 21, fontWeight: "normal", marginTop: 12 }, heroText: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 6 },
  sectionTitle: { fontFamily: "Inter_500Medium", color: palette.secondary, fontSize: 13, fontWeight: "normal", marginTop: 5 }, modeRow: { flexDirection: "row", gap: 10 },
  modeCard: { flex: 1, minHeight: 116, borderRadius: 16, backgroundColor: palette.input, borderWidth: 1, borderColor: palette.border, padding: 14, gap: 6 }, modeActive: { borderColor: palette.selectedBorder, backgroundColor: palette.selected },
  modeTitle: { fontFamily: "Inter_500Medium", color: palette.text, fontSize: 16, fontWeight: "normal" }, modeText: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 12, lineHeight: 17 },
  input: { fontFamily: "Inter_400Regular", minHeight: 48, borderRadius: 13, backgroundColor: palette.input, borderWidth: 1, borderColor: palette.border, color: palette.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, description: { minHeight: 90, textAlignVertical: "top" },
  createButton: { minHeight: 54, borderRadius: 15, backgroundColor: palette.button, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 }, createText: { fontFamily: "Inter_500Medium", color: palette.onButton, fontSize: 16, fontWeight: "normal" }, disabled: { opacity: 0.6 },
});
