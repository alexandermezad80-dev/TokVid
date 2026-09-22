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

  useEffect(() => {
    if (!conversationId) return;
    void getCallHistory(conversationId)
      .then(setCalls)
      .finally(() => setLoading(false));
  }, [conversationId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Historial de llamadas</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FE2C55" /></View>
      ) : calls.length === 0 ? (
        <View style={styles.center}>
          <Feather name="phone" size={38} color="#444" />
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
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#151515" },
  back: { padding: 4 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  empty: { color: "#666", fontSize: 14 },
  list: { paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: "#111" },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  status: { color: "#fff", fontSize: 15, fontWeight: "600" },
  meta: { color: "#777", fontSize: 12, marginTop: 4 },
});
