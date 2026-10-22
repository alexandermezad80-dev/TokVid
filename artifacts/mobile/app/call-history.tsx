import HeaderSurface from '../components/reference/HeaderSurface';
import {palette} from '../constants/palette';
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCallHistory, type Call } from "../lib/features/calls/services/calls-service";

function statusLabel(call: Call) {
  if (call.status === "missed") return "Llamada perdida";
  if (call.status === "rejected") return "Llamada rechazada";
  if (call.status === "cancelled") return "Llamada cancelada";
  if (call.status === "ended") return "Llamada finalizada";
  return call.type === "video" ? "Videollamada" : "Llamada de voz";
}

function durationLabel(call: Call) {
  if (!call.answered_at || !call.ended_at) return "";
  const seconds = Math.max(0, Math.floor((new Date(call.ended_at).getTime() - new Date(call.answered_at).getTime()) / 1000));
  return ` · ${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function CallHistoryScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      setError("No se encontró la conversación.");
      return;
    }

    setLoading(true);
    setError(null);
    void getCallHistory(conversationId)
      .then(setCalls)
      .catch((loadError) => {
        setCalls([]);
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <HeaderSurface safeTop style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={24} color="#0B0B0D" />
        </TouchableOpacity>
        <Text style={styles.title}>Historial de llamadas</Text>
      </HeaderSurface>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FE2C55" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={38} color={palette.secondary} />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => {
              if (!conversationId) return;
              setLoading(true);
              setError(null);
              void getCallHistory(conversationId)
                .then(setCalls)
                .catch((loadError) => {
                  setCalls([]);
                  setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
                })
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : calls.length === 0 ? (
        <View style={styles.center}>
          <Feather name="phone" size={38} color={palette.secondary} />
          <Text style={styles.empty}>No hay llamadas todavía.</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.icon}>
                <Feather name={item.type === "video" ? "video" : "phone"} size={20} color="#fff" />
              </View>
              <View style={styles.info}>
                <Text style={styles.status}>{statusLabel(item)}</Text>
                <Text style={styles.meta}>
                  {new Date(item.created_at).toLocaleString()} {durationLabel(item)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: palette.border },
  back: { padding: 4 },
  title: { fontFamily: "Inter_500Medium", color: palette.headerText, fontSize: 18, fontWeight: "normal" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 24 },
  empty: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 14 },
  error: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 14, textAlign: "center" },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: palette.button },
  retryText: { fontFamily: "Inter_500Medium", color: palette.onButton, fontSize: 14, fontWeight: "normal" },
  list: { paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.button, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  status: { fontFamily: "Inter_500Medium", color: palette.text, fontSize: 15, fontWeight: "normal" },
  meta: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 12, marginTop: 4 },
});

