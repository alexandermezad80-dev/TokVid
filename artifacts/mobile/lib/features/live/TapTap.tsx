import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase";

interface Props { roomId: string; userId: string; }
interface TapEvent { userId: string; count: number; nonce: string; figureId: string; }
interface TapActivity { user_id: string; tap_count: number; }

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
  const [remoteFigure, setRemoteFigure] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [activity, setActivity] = useState<TapActivity[]>([]);
  const [channelReady, setChannelReady] = useState(false);
  const windowStart = useRef(0);
  const tapsInWindow = useRef(0);
  const lastEventAt = useRef(0);
  const remoteAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelName = useMemo(() => `live:${roomId}:tap-tap`, [roomId]);
  const selectedFigure = FIGURES.find((f) => f.id === figureId) ?? FIGURES[0];
  const remoteSelectedFigure = FIGURES.find((f) => f.id === remoteFigure) ?? FIGURES[0];

  useEffect(() => {
    void AsyncStorage.getItem(FIGURE_STORAGE_KEY).then((stored) => {
      if (stored && FIGURES.some((f) => f.id === stored)) setFigureId(stored);
    });
  }, []);

  useEffect(() => {
    let active = true;
    const loadHost = async () => {
      const { data } = await supabase.from("live_rooms").select("host_id").eq("id", roomId).maybeSingle();
      if (active) setIsHost(data?.host_id === userId);
    };
    void loadHost();
    return () => { active = false; };
  }, [roomId, userId]);

  useEffect(() => {
    if (!isHost) return;
    let active = true;
    const syncActivity = async () => {
      const { data, error } = await supabase
        .from("live_tap_activity")
        .select("user_id,tap_count")
        .eq("room_id", roomId)
        .order("tap_count", { ascending: false })
        .limit(8);
      if (!error && active) setActivity((data ?? []) as TapActivity[]);
    };
    void syncActivity();
    const channel = supabase
      .channel(`live:${roomId}:tap-activity`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_tap_activity",
        filter: `room_id=eq.${roomId}`,
      }, () => { void syncActivity(); })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [isHost, roomId]);

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

    channel.on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "live_tap_totals",
      filter: `room_id=eq.${roomId}`,
    }, () => { void syncTotal(); });

    channel.on("broadcast", { event: "tap" }, ({ payload }) => {
      const event = payload as TapEvent;
      if (!active || event.userId === userId || !FIGURES.some((f) => f.id === event.figureId)) return;
      setRemoteFigure(event.figureId);
      if (remoteAnimationTimer.current) clearTimeout(remoteAnimationTimer.current);
      remoteAnimationTimer.current = setTimeout(() => setRemoteFigure(null), 420);
    });

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
      if (remoteAnimationTimer.current) clearTimeout(remoteAnimationTimer.current);
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

    const { error } = await supabase.rpc("live_send_taps", {
      p_room_id: roomId,
      p_count: accepted,
    });
    if (error) return;

    setTapCount((v) => v + accepted);
    const channel = channelRef.current;
    if (!channel || !channelReady) return;
    await channel.send({
      type: "broadcast",
      event: "tap",
      payload: {
        userId,
        count: accepted,
        figureId,
        nonce: `${userId}-${now}-${Math.random().toString(36).slice(2)}`,
      } satisfies TapEvent,
    });
  }, [channelReady, figureId, roomId, userId]);

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
      <View style={styles.preview}>
        {remoteFigure ? <Text style={styles.animation}>{remoteSelectedFigure.emoji}</Text> : null}
      </View>

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
          <Pressable key={figure.id} accessibilityRole="button" accessibilityLabel={figure.label} onPress={() => selectFigure(figure.id)} style={[styles.option, figure.id === figureId && styles.selected]}>
            <Text style={styles.emoji}>{figure.emoji}</Text>
          </Pressable>
        ))}
      </View>

      {isHost ? (
        <View style={styles.activityPanel}>
          <Text style={styles.activityTitle}>Actividad Tap-Tap</Text>
          {activity.length === 0 ? (
            <Text style={styles.sub}>Todavía no hay actividad.</Text>
          ) : activity.map((item) => (
            <View key={item.user_id} style={styles.activityRow}>
              <Text style={styles.activityUser}>Usuario {item.user_id.slice(0, 8)}</Text>
              <Text style={styles.activityCount}>{item.tap_count}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  activityPanel: { width: "100%", marginTop: 24, gap: 6 },
  activityTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  activityRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#151515", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  activityUser: { color: "#ddd", fontSize: 12 },
  activityCount: { color: "#fff", fontWeight: "800" },
});
