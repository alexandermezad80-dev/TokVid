import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase";

interface Props {
  roomId: string;
  userId: string;
  onClose?: () => void;
}

interface Room {
  host_id: string;
}

interface QuiemeRow {
  user_id: string;
  host_id: string;
}

export default function Quieme({ roomId, userId, onClose }: Props) {
  const [hostId, setHostId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [given, setGiven] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: room, error: roomError } = await supabase
      .from("live_rooms")
      .select("host_id")
      .eq("id", roomId)
      .eq("state", "active")
      .maybeSingle();

    if (roomError) {
      setError("No se pudo cargar el LIVE.");
      setLoading(false);
      return;
    }

    if (!room) {
      setError("Este LIVE ya no está activo.");
      setLoading(false);
      return;
    }

    const liveRoom = room as Room;
    setHostId(liveRoom.host_id);

    const { data: rows, error: quiemeError } = await supabase
      .from("live_quieme")
      .select("user_id, host_id")
      .eq("room_id", roomId);

    if (quiemeError) {
      setError("No se pudo cargar Quiéreme.");
      setLoading(false);
      return;
    }

    const quiemes = (rows ?? []) as QuiemeRow[];
    setCount(quiemes.length);
    setGiven(quiemes.some((row) => row.user_id === userId));
    setLoading(false);
  }, [roomId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(async () => {
    if (!hostId || hostId === userId || given || busy) return;

    setBusy(true);
    setError(null);

    const { error: sendError } = await supabase.rpc("live_send_quieme", {
      p_room_id: roomId,
    });

    if (sendError) {
      setError(sendError.message || "No se pudo enviar Quiéreme.");
      setBusy(false);
      return;
    }

    setGiven(true);
    setCount((value) => value + 1);
    setBusy(false);
  }, [busy, given, hostId, roomId, userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiéreme</Text>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.subtitle}>apoyos al anfitrión en este LIVE</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={given ? "Quiéreme enviado" : "Enviar Quiéreme al anfitrión"}
        disabled={!hostId || hostId === userId || given || busy}
        onPress={() => void send()}
        style={({ pressed }) => [
          styles.button,
          given && styles.buttonDone,
          pressed && !given && styles.buttonPressed,
        ]}
      >
        <Text style={styles.heart}>❤️</Text>
        <Text style={styles.buttonText}>
          {busy ? "Enviando…" : given ? "Enviado" : "Quiéreme"}
        </Text>
      </Pressable>

      {hostId === userId && (
        <Text style={styles.note}>El anfitrión no puede darse Quiéreme a sí mismo.</Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {onClose && (
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>Cerrar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  count: { color: "#fff", fontSize: 48, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#999", fontSize: 13, marginBottom: 28 },
  button: {
    minWidth: 190,
    minHeight: 74,
    borderRadius: 37,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    borderWidth: 2,
    borderColor: "#fff",
    flexDirection: "row",
    gap: 10,
  },
  buttonDone: { opacity: 0.65 },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  heart: { fontSize: 26 },
  buttonText: { color: "#fff", fontSize: 19, fontWeight: "900" },
  note: { color: "#aaa", fontSize: 12, textAlign: "center", marginTop: 18 },
  error: { color: "#ff8080", fontSize: 12, textAlign: "center", marginTop: 18 },
  close: { marginTop: 28, padding: 10 },
  closeText: { color: "#bbb", fontSize: 14 },
});
