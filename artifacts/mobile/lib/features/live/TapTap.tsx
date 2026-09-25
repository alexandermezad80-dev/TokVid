import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase";

interface Props { roomId: string; userId: string; }
interface TapEvent { userId: string; count: number; nonce: string; }

const TAP_WINDOW_MS = 1000;
const MAX_TAPS_PER_WINDOW = 8;
const MIN_TAP_INTERVAL_MS = 60;
const FIGURE_STORAGE_KEY = "tokvid.live.tap-tap.figure";
const FIGURES = [
  { id: "spark", label: "Chispa", emoji: "⚡" },
  { id: "heart", label: "Corazón", emoji: "❤️" },
  { id: "fire", label: "Fuego", emoji: "🔥" },
  { id: "star", label: "Estrella", emoji: "⭐" },
  { id: "crown", label: "Corona", emoji: "👑" },
  { id: "diamond", label: "Diamante", emoji: "💎" },
  { id: "rocket", label: "Cohete", emoji: "🚀" },
  { id: "party", label: "Fiesta", emoji: "🎉" },
] as const;

export default function TapTap({ roomId, userId }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const [globalTaps, setGlobalTaps] = useState(0);
  const [figureId, setFigureId] = useState("spark");
  const [showFigure, setShowFigure] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const windowStart = useRef(0);
  const tapsInWindow = useRef(0);
  const lastEventAt = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelName = useMemo(() => `live:${roomId}:tap-tap`, [roomId]);
  const selectedFigure = FIGURES.find((f) => f.id === figureId) ?? FIGURES[0];

  useEffect(() => {
    void AsyncStorage.getItem(FIGURE_STORAGE_KEY).then((stored) => {
      if (stored && FIGURES.some((f) => f.id === stored)) setFigureId(stored);
    });
  }, []);

  useEffect(() => {
    let active = true;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });
    channelRef.current = channel;

    const syncTotal = async () => {
      const { data, error } = await supabase
        .from("live_tap_totals")
        .select("total_taps")
        .eq("room_id", roomId)
        .maybeSingle();
      if (!error && active) setGlobalTaps(Number(data?.total_taps ?? 0));
    };

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_tap_totals",
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        void syncTotal();
      },
    );

    void channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || !active) return;
      setChannelReady(true);
      await channel.track({ figureId });
      await syncTotal();
    });

    return () => {
      active = false;
      setChannelReady(false);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [channelName, userId]);

  useEffect(() => {
    const channel = channelRef.current;
    if (channel && channelReady) void channel.track({ tapCount, figureId });
  }, [tapCount, figureId, channelReady]);

  const selectFigure = useCallback((id: string) => {
    setFigureId(id);
    void AsyncStorage.setItem(FIGURE_STORAGE_KEY, id);
  }, []);

  const sendTaps = useCallback(async (count: number) => {
    const now = Date.now();
    if (now - windowStart.current >= TAP_WINDOW_MS) {
      windowStart.current = now;
      tapsInWindow.current = 0;
    }
    const accepted = Math.min(count, Math.max(MAX_TAPS_PER_WINDOW - tapsInWindow.current, 0));
    if (accepted <= 0) return;
    tapsInWindow.current += accepted;
    setTapCount((v) => v + accepted);
    setShowFigure(true);
    setTimeout(() => setShowFigure(false), 420);

    const channel = channelRef.current;
    const { error } = await supabase.rpc("live_send_taps", {
      p_room_id: roomId,
      p_count: accepted,
    });
    if (error) return;

    if (!channel || !channelReady) return;
    await channel.send({
      type: "broadcast",
      event: "tap",
      payload: {
        userId,
        count: accepted,
        nonce: `${userId}-${now}-${Math.random().toString(36).slice(2)}`,
      } satisfies TapEvent,
    });
  }, [channelReady, roomId, userId]);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastEventAt.current < MIN_TAP_INTERVAL_MS) return;
    lastEventAt.current = now;
    void sendTaps(1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tap-Tap del LIVE</Text>
      <Text style={styles.count}>{globalTaps}</Text>
      <Text style={styles.sub}>Total acumulado de esta sesión LIVE</Text>
      <Text style={styles.personal}>Mis Tap-Tap: {tapCount}</Text>
      <View style={styles.preview}>{showFigure && <Text style={styles.animation}>{selectedFigure.emoji}</Text>}</View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Enviar Tap-Tap con ${selectedFigure.label}`}
        onPress={handlePress}
        onLongPress={() => void sendTaps(4)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonFigure}>{selectedFigure.emoji}</Text>
        <Text style={styles.buttonText}>TAP</Text>
        <Text style={styles.hint}>Toca para apoyar el LIVE</Text>
      </Pressable>

      <Text style={styles.selectorTitle}>Elige tu figura</Text>
      <View style={styles.row}>
        {FIGURES.map((figure) => (
          <Pressable
            key={figure.id}
            accessibilityRole="button"
            accessibilityLabel={figure.label}
            onPress={() => selectFigure(figure.id)}
            style={[styles.option, figure.id === figureId && styles.selected]}
          >
            <Text style={styles.emoji}>{figure.emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 24 },
  label: { color: "#aaa", fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  count: { color: "#fff", fontSize: 48, fontWeight: "900", marginTop: 4 },
  sub: { color: "#888", fontSize: 12 },
  personal: { color: "#ddd", fontSize: 14, marginTop: 8, fontWeight: "600" },
  preview: { height: 56, alignItems: "center", justifyContent: "center" },
  animation: { fontSize: 46 },
  button: { width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center", backgroundColor: "#222", borderWidth: 2, borderColor: "#fff" },
  pressed: { transform: [{ scale: 0.96 }] },
  buttonFigure: { fontSize: 40 },
  buttonText: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 2 },
  hint: { color: "#aaa", fontSize: 11, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },
  selectorTitle: { color: "#bbb", fontSize: 13, fontWeight: "700", marginTop: 26, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, maxWidth: 330 },
  option: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#171717", borderWidth: 1, borderColor: "#333" },
  selected: { borderColor: "#fff", backgroundColor: "#292929" },
  emoji: { fontSize: 22 },
});
