import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase";

type Participant = { userId: string; role: string };
type GiftRecord = { id: string; sender_id: string; recipient_id: string; gift_type: string; quantity: number; created_at: string };

type GiftCatalogItem = {
  id: string;
  name: string;
  category: "CAT_01" | "CAT_02" | "CAT_03";
  coin_cost: number;
  animation_level: "LVL_1" | "LVL_2" | "LVL_3" | "LVL_4";
};

const GIFT_ICONS = ["🎁", "✨", "💎", "🌟", "🎉", "🏆"];
const giftIcon = (index: number) => GIFT_ICONS[index % GIFT_ICONS.length];

export default function LiveGifts({ roomId }: { roomId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [giftActivity, setGiftActivity] = useState<GiftRecord[]>([]);
  const [gifts, setGifts] = useState<GiftCatalogItem[]>([]);
  const [receivedGift, setReceivedGift] = useState<GiftRecord | null>(null);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void supabase
      .from("live_gift_catalog")
      .select("id,name,category,coin_cost,animation_level")
      .eq("active", true)
      .order("coin_cost", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          Alert.alert("Regalos", error.message);
          return;
        }
        setGifts((data ?? []) as GiftCatalogItem[]);
      });
    return () => { active = false; };
  }, []);

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
        setParticipants((data ?? []).map((row) => ({ userId: row.user_id, role: row.role })));
        if (data?.[0]) setSelectedRecipient(data[0].user_id);
      });
    return () => { active = false; };
  }, [roomId]);

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      const { data, error } = await supabase
        .from("live_gifts")
        .select("id,sender_id,recipient_id,gift_type,quantity,created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      if (error) {
        Alert.alert("Regalos", error.message);
        return;
      }
      setGiftActivity((data ?? []) as GiftRecord[]);
    };

    void loadActivity();
    const channel = supabase
      .channel(`live:${roomId}:gifts`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_gifts",
        filter: `room_id=eq.${roomId}`,
      }, ({ new: row }) => {
        const gift = row as GiftRecord;
        if (!active) return;
        setGiftActivity((current) => [gift, ...current.filter((item) => item.id !== gift.id)].slice(0, 30));
        setReceivedGift(gift);
        if (animationTimer.current) clearTimeout(animationTimer.current);
        animationTimer.current = setTimeout(() => setReceivedGift(null), 1200);
      })
      .subscribe();

    return () => {
      active = false;
      if (animationTimer.current) clearTimeout(animationTimer.current);
      void supabase.removeChannel(channel);
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
          <Pressable key={participant.userId} style={[styles.recipient, selectedRecipient === participant.userId && styles.selected]} onPress={() => setSelectedRecipient(participant.userId)}>
            <Text style={styles.recipientText}>{participant.role === "host" ? "Anfitrión" : "Guest"}</Text>
          </Pressable>
        ))}
      </View>

      {receivedGift ? (
        <View style={styles.receivedBanner} accessibilityLiveRegion="polite">
          <Text style={styles.receivedIcon}>🎁</Text>
          <Text style={styles.receivedText}>Nuevo regalo · {receivedGift.gift_type} × {receivedGift.quantity}</Text>
        </View>
      ) : null}

      <View style={styles.gifts}>
        {gifts.map((gift, index) => (
          <Pressable key={gift.id} style={styles.gift} onPress={() => void sendGift(gift.id)} disabled={sending || !selectedRecipient}>
            <Text style={styles.icon}>{giftIcon(index)}</Text>
            <Text style={styles.label}>{gift.name}</Text>
            <Text style={styles.cost}>{gift.coin_cost} 🪙</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.activityTitle}>Actividad de regalos</Text>
      {giftActivity.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay regalos en este LIVE.</Text>
      ) : (
        <View style={styles.activity}>
          {giftActivity.map((gift) => {
            const recipient = participants.find((participant) => participant.userId === gift.recipient_id);
            return (
              <View key={gift.id} style={styles.activityRow}>
                <Text style={styles.activityText}>{gift.gift_type} × {gift.quantity}</Text>
                <Text style={styles.activityRecipient}>{recipient?.role === "host" ? "Anfitrión" : "Guest"}</Text>
              </View>
            );
          })}
        </View>
      )}

      {participants.length === 0 ? <Text style={styles.empty}>No hay participantes activos para recibir regalos.</Text> : null}
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
  receivedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#202020", borderRadius: 14, padding: 12, marginBottom: 14 },
  receivedIcon: { fontSize: 26 },
  receivedText: { color: "#fff", fontWeight: "800", flex: 1 },
  gifts: { flexDirection: "row", justifyContent: "space-between" },
  gift: { alignItems: "center", padding: 10 },
  icon: { fontSize: 34 },
  label: { color: "#fff", fontSize: 11, marginTop: 5 },
  cost: { color: "#999", fontSize: 10, marginTop: 2 },
  empty: { color: "#999", marginTop: 20, textAlign: "center" },
  activityTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 28, marginBottom: 10 },
  activity: { gap: 8 },
  activityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#151515", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  activityText: { color: "#fff", fontWeight: "700" },
  activityRecipient: { color: "#999", fontSize: 12 },
});
