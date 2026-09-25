import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase";

type Participant = { userId: string; role: string };

const GIFTS = [
  { id: "rose", label: "Rosa", icon: "🌹" },
  { id: "heart", label: "Corazón", icon: "❤️" },
  { id: "star", label: "Estrella", icon: "⭐" },
  { id: "fire", label: "Fuego", icon: "🔥" },
  { id: "crown", label: "Corona", icon: "👑" },
];

export default function LiveGifts({ roomId }: { roomId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase
      .from("live_participants")
      .select("user_id,role")
      .eq("room_id", roomId)
      .eq("participation_state", "active")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          Alert.alert("Regalos", error.message);
          return;
        }
        setParticipants(
          (data ?? []).map((row) => ({ userId: row.user_id, role: row.role })),
        );
        if (data?.[0]) setSelectedRecipient(data[0].user_id);
      });
    return () => {
      active = false;
    };
  }, [roomId]);

  const sendGift = async (giftType: string) => {
    if (!selectedRecipient || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc("live_send_gift", {
        p_room_id: roomId,
        p_recipient_id: selectedRecipient,
        p_gift_type: giftType,
        p_quantity: 1,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      Alert.alert("Regalo", error instanceof Error ? error.message : "No se pudo enviar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Regalos</Text>
      <Text style={styles.subtitle}>Elige a quién enviar</Text>
      <View style={styles.recipients}>
        {participants.map((participant) => (
          <Pressable
            key={participant.userId}
            style={[styles.recipient, selectedRecipient === participant.userId && styles.selected]}
            onPress={() => setSelectedRecipient(participant.userId)}
          >
            <Text style={styles.recipientText}>
              {participant.role === "host" ? "Anfitrión" : "Guest"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.gifts}>
        {GIFTS.map((gift) => (
          <Pressable
            key={gift.id}
            style={styles.gift}
            onPress={() => void sendGift(gift.id)}
            disabled={sending || !selectedRecipient}
          >
            <Text style={styles.icon}>{gift.icon}</Text>
            <Text style={styles.label}>{gift.label}</Text>
          </Pressable>
        ))}
      </View>
      {participants.length === 0 ? (
        <Text style={styles.empty}>No hay participantes activos para recibir regalos.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808", padding: 20, paddingTop: 56 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#999", marginTop: 4, marginBottom: 14 },
  recipients: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  recipient: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: "#1b1b1b" },
  selected: { borderWidth: 1, borderColor: "#fff" },
  recipientText: { color: "#fff", fontWeight: "700" },
  gifts: { flexDirection: "row", justifyContent: "space-between" },
  gift: { alignItems: "center", padding: 10 },
  icon: { fontSize: 34 },
  label: { color: "#fff", fontSize: 11, marginTop: 5 },
  empty: { color: "#999", marginTop: 20, textAlign: "center" },
});
