import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase";

interface Props {
  roomId: string;
  userId: string;
}

interface TapEvent {
  userId: string;
  count: number;
  nonce: string;
}

const TAP_WINDOW_MS = 1000;
const MAX_TAPS_PER_WINDOW = 8;

export default function TapTap({ roomId, userId }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const [remoteTaps, setRemoteTaps] = useState(0);
  const windowStart = useRef(0);
  const tapsInWindow = useRef(0);
  const lastEventAt = useRef(0);

  const channelName = useMemo(() => `live:${roomId}:tap-tap`, [roomId]);

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "tap" }, ({ payload }) => {
      const event = payload as TapEvent;
      if (!event || event.userId === userId || event.count < 1) return;
      setRemoteTaps((value) => value + event.count);
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, userId]);

  const sendTaps = useCallback(
    async (count: number) => {
      const now = Date.now();

      if (now - windowStart.current >= TAP_WINDOW_MS) {
        windowStart.current = now;
        tapsInWindow.current = 0;
      }

      const remaining = MAX_TAPS_PER_WINDOW - tapsInWindow.current;
      const accepted = Math.min(count, Math.max(remaining, 0));

      if (accepted <= 0) return;

      tapsInWindow.current += accepted;
      setTapCount((value) => value + accepted);

      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      await channel.subscribe();

      await channel.send({
        type: "broadcast",
        event: "tap",
        payload: {
          userId,
          count: accepted,
          nonce: `${userId}-${now}-${Math.random().toString(36).slice(2)}`,
        } satisfies TapEvent,
      });

      void supabase.removeChannel(channel);
    },
    [channelName, userId],
  );

  const handlePress = () => {
    const now = Date.now();
    if (now - lastEventAt.current < 60) return;
    lastEventAt.current = now;
    void sendTaps(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Text style={styles.label}>Tap-Tap</Text>
        <Text style={styles.count}>{tapCount}</Text>
        {remoteTaps > 0 && (
          <Text style={styles.remote}>LIVE: +{remoteTaps}</Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar Tap-Tap"
        onPress={handlePress}
        onLongPress={() => void sendTaps(4)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Feather name="zap" size={42} color="#fff" />
        <Text style={styles.buttonText}>TAP</Text>
        <Text style={styles.hint}>Toca rápido para apoyar el LIVE</Text>
      </Pressable>
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
  stats: {
    alignItems: "center",
    marginBottom: 28,
  },
  label: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  count: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "800",
    marginTop: 4,
  },
  remote: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    borderWidth: 2,
    borderColor: "#fff",
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
  },
  hint: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
