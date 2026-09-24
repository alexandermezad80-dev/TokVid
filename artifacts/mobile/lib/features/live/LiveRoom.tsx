import {
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  createAgoraRtcEngine,
  type IRtcEngine,
} from "react-native-agora";
import { Camera } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase";
import { agoraUidFromUserId, getLiveRtcCredentials, type LiveRole } from "./live-rtc-service";
import { deriveLiveLayout, type LiveParticipantLayoutItem } from "./layout";

type Participant = LiveParticipantLayoutItem & {
  participationState: string;
  cameraAuthorized: boolean;
  micAuthorized: boolean;
  cameraState: "on" | "off";
  micState: "on" | "off";
};

type Room = {
  id: string;
  host_id: string;
  mode: "solo" | "guests";
  state: "active" | "finished";
  title: string | null;
};

export default function LiveRoom() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();
  const engineRef = useRef<IRtcEngine | null>(null);
  const mountedRef = useRef(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [role, setRole] = useState<LiveRole>("spectator");
  const [cameraAuthorized, setCameraAuthorized] = useState(false);
  const [micAuthorized, setMicAuthorized] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rtcReady, setRtcReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMember = role === "host" || role === "guest";
  const refreshRoom = useCallback(async () => {
    if (!roomId || !user?.id) return;

    const [{ data: roomData, error: roomError }, { data: participantRows, error: participantError }] =
      await Promise.all([
        supabase
          .from("live_rooms")
          .select("id,host_id,mode,state,title")
          .eq("id", roomId)
          .maybeSingle(),
        supabase
          .from("live_participants")
          .select("user_id,role,participation_state,window_slot,camera_authorized,mic_authorized,camera_state,mic_state")
          .eq("room_id", roomId)
          .in("participation_state", ["active", "spectator", "pending_request", "pending_invitation"]),
      ]);

    if (roomError) throw new Error(roomError.message);
    if (!roomData) throw new Error("LIVE no encontrado.");

    const normalized = (participantRows ?? []).map((row) => ({
      userId: row.user_id,
      role: row.role as Participant["role"],
      windowSlot: row.window_slot,
      participationState: row.participation_state,
      cameraAuthorized: row.camera_authorized,
      micAuthorized: row.mic_authorized,
      cameraState: row.camera_state,
      micState: row.mic_state,
    })) as Participant[];

    setRoom(roomData as Room);
    setParticipants(normalized);

    const own = normalized.find((participant) => participant.userId === user.id);
    if (own) {
      setRole(own.role);
      setCameraAuthorized(own.cameraAuthorized);
      setMicAuthorized(own.micAuthorized);
      setCameraOn(own.cameraState === "on");
      setMicOn(own.micState === "on");
    } else {
      setRole("spectator");
      setCameraAuthorized(false);
      setMicAuthorized(false);
      setCameraOn(false);
      setMicOn(false);
    }
  }, [roomId, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);
    void refreshRoom()
      .catch((err) => {
        if (mountedRef.current) setError(err instanceof Error ? err.message : "No se pudo cargar el LIVE.");
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [refreshRoom]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`live:${roomId}:room`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_participants",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void refreshRoom();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_rooms",
          filter: `id=eq.${roomId}`,
        },
        () => {
          void refreshRoom();
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ role?: string }>();
        const count = Object.values(state).reduce(
          (sum, entries) => sum + (entries[0]?.role === "spectator" ? 1 : 0),
          0,
        );
        setSpectatorCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user?.id) {
          await channel.track({ role: isMember ? role : "spectator" });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refreshRoom, user?.id, isMember, role]);

  useEffect(() => {
    if (!roomId || !user?.id || !room) return;

    let cancelled = false;

    const startRtc = async () => {
      try {
        const credentials = await getLiveRtcCredentials(roomId);
        if (cancelled) return;

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        engine.initialize({
          appId: credentials.appId,
          channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        });

        engine.registerEventHandler({
          onUserJoined: (_connection, uid) => {
            if (!cancelled) {
            }
          },
          onUserOffline: (_connection, uid) => {
          },
          onTokenPrivilegeWillExpire: async () => {
            try {
              const refreshed = await getLiveRtcCredentials(roomId);
              if (!cancelled) await engine.renewToken(refreshed.token);
            } catch {
              // The next room refresh remains authoritative.
            }
          },
        });

        const broadcaster = credentials.role !== "spectator";
        engine.setClientRole(
          broadcaster ? ClientRoleType.clientRoleBroadcaster : ClientRoleType.clientRoleAudience,
        );
        engine.enableAudio();
        if (broadcaster) engine.enableVideo();

        await engine.joinChannel(credentials.token, credentials.channel, credentials.uid, {
          clientRoleType: broadcaster
            ? ClientRoleType.clientRoleBroadcaster
            : ClientRoleType.clientRoleAudience,
          channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
          publishMicrophoneTrack: broadcaster && credentials.micState === "on",
          publishCameraTrack: broadcaster && credentials.cameraState === "on",
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });

        if (!cancelled) setRtcReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo conectar el audiovisual del LIVE.");
        }
      }
    };

    void startRtc();

    return () => {
      cancelled = true;
      setRtcReady(false);
      const engine = engineRef.current;
      if (engine) {
        void engine.leaveChannel();
        engine.release();
        engineRef.current = null;
      }
    };
  }, [roomId, user?.id, room]);

  const requestToJoin = async () => {
    if (!roomId || joining || room?.mode !== "guests") return;
    setJoining(true);
    try {
      const { error: requestError } = await supabase.rpc("live_request_to_join", {
        p_room_id: roomId,
      });
      if (requestError) throw new Error(requestError.message);
      Alert.alert("Solicitud enviada", "El anfitrión debe aceptar tu entrada como Guest.");
      await refreshRoom();
    } catch (err) {
      Alert.alert("No se pudo solicitar entrada", err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setJoining(false);
    }
  };

  const toggleCamera = async () => {
    if (!isMember || !cameraAuthorized || !engineRef.current) return;

    const next = !cameraOn;
    if (next) {
      const permission = await Camera.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Cámara", "Debes permitir el acceso a la cámara para activarla.");
        return;
      }
    }

    const { error: stateError } = await supabase.rpc("live_set_camera_state", {
      p_room_id: roomId,
      p_camera_state: next ? "on" : "off",
    });
    if (stateError) {
      Alert.alert("Cámara", stateError.message);
      return;
    }

    engineRef.current.enableVideo();
    engineRef.current.enableLocalVideo(next);
    setCameraOn(next);
  };

  const toggleMic = async () => {
    if (!isMember || !micAuthorized || !engineRef.current) return;

    const next = !micOn;
    if (next) {
      const permission = await Camera.requestMicrophonePermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Micrófono", "Debes permitir el acceso al micrófono para activarlo.");
        return;
      }
    }

    const { error: stateError } = await supabase.rpc("live_set_mic_state", {
      p_room_id: roomId,
      p_mic_state: next ? "on" : "off",
    });
    if (stateError) {
      Alert.alert("Micrófono", stateError.message);
      return;
    }

    engineRef.current.enableAudio();
    engineRef.current.muteLocalAudioStream(!next);
    setMicOn(next);
  };

  const leave = async () => {
    try {
      if (role === "host") {
        const { error: finishError } = await supabase.rpc("live_finish_room", { p_room_id: roomId });
        if (finishError) throw new Error(finishError.message);
      } else if (role === "guest") {
        const { error: leaveError } = await supabase.rpc("live_leave", { p_room_id: roomId });
        if (leaveError) throw new Error(leaveError.message);
      }
    } catch (err) {
      Alert.alert("LIVE", err instanceof Error ? err.message : "No se pudo cerrar la participación.");
      return;
    }

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.muted}>Cargando LIVE…</Text>
      </View>
    );
  }

  if (error || !room) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "LIVE no encontrado."}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Cerrar</Text>
        </Pressable>
      </View>
    );
  }

  const activeParticipants = participants.filter(
    (participant) => participant.participationState === "active",
  );
  const layout = deriveLiveLayout({
    layout: "dynamic",
    participants: activeParticipants,
  });

  const activeRemoteParticipants = layout.guests
    .concat(layout.host ? [layout.host] : [])
    .filter((participant) => participant.userId !== user?.id);

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {activeRemoteParticipants.length === 0 && !cameraOn ? (
          <View style={styles.emptyStage}>
            <Feather name="video" size={42} color="#666" />
            <Text style={styles.emptyTitle}>LIVE activo</Text>
            <Text style={styles.muted}>Esperando video de los participantes…</Text>
          </View>
        ) : null}

        {activeRemoteParticipants.map((participant) => (
          <View key={participant.userId} style={participant.role === "host" ? styles.hostVideo : styles.guestVideo}>
            {participant.cameraState === "on" ? (
              <RtcSurfaceView
                style={StyleSheet.absoluteFill}
                canvas={{ uid: agoraUidFromUserId(participant.userId) }}
              />
            ) : (
              <View style={styles.offVideo}>
                <Feather name="video-off" size={28} color="#aaa" />
                <Text style={styles.muted}>{participant.role === "host" ? "Anfitrión" : "Guest"}</Text>
              </View>
            )}
            <View style={styles.nameBadge}>
              <Text style={styles.nameText}>{participant.role === "host" ? "Anfitrión" : "Guest"}</Text>
            </View>
          </View>
        ))}

        {isMember ? (
          <View style={styles.localVideo}>
            {cameraOn ? (
              <RtcSurfaceView
                style={StyleSheet.absoluteFill}
                canvas={{ uid: 0 }}
                zOrderMediaOverlay
              />
            ) : (
              <View style={styles.offVideo}>
                <Feather name="video-off" size={20} color="#aaa" />
                <Text style={styles.muted}>Tu cámara está apagada</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>{room.title || "LIVE"}</Text>
            <Text style={styles.meta}>
              {spectatorCount} viendo · {layout.guestCount}/11 Guests
            </Text>
          </View>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {!isMember && room.mode === "guests" && (
        <Pressable style={styles.joinButton} onPress={() => void requestToJoin()} disabled={joining}>
          {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Solicitar participar</Text>}
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.action, (!isMember || !cameraAuthorized) && styles.disabled]}
          onPress={() => void toggleCamera()}
          disabled={!isMember || !cameraAuthorized || !rtcReady}
        >
          <Feather name={cameraOn ? "video" : "video-off"} size={21} color="#fff" />
          <Text style={styles.actionText}>{cameraOn ? "Cámara" : "Cámara off"}</Text>
        </Pressable>

        <Pressable
          style={[styles.action, (!isMember || !micAuthorized) && styles.disabled]}
          onPress={() => void toggleMic()}
          disabled={!isMember || !micAuthorized || !rtcReady}
        >
          <Feather name={micOn ? "mic" : "mic-off"} size={21} color="#fff" />
          <Text style={styles.actionText}>{micOn ? "Micrófono" : "Mic off"}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/live-chat?roomId=${roomId}`)}>
          <Feather name="message-circle" size={21} color="#fff" />
          <Text style={styles.actionText}>Chat</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/live-tap-tap?roomId=${roomId}`)}>
          <Feather name="zap" size={21} color="#fff" />
          <Text style={styles.actionText}>Tap</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/live-quieme?roomId=${roomId}`)}>
          <Feather name="heart" size={21} color="#fff" />
          <Text style={styles.actionText}>Quiéreme</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/live-effects?roomId=${roomId}`)}>
          <Feather name="sliders" size={21} color="#fff" />
          <Text style={styles.actionText}>Efectos</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => router.push(`/live-share?roomId=${roomId}`)}>
          <Feather name="share-2" size={21} color="#fff" />
          <Text style={styles.actionText}>Compartir</Text>
        </Pressable>

        <Pressable style={styles.endAction} onPress={() => void leave()}>
          <Feather name={role === "host" ? "stop-circle" : "log-out"} size={21} color="#fff" />
          <Text style={styles.actionText}>{role === "host" ? "Finalizar" : "Salir"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  stage: { flex: 1, backgroundColor: "#080808", position: "relative" },
  hostVideo: { ...StyleSheet.absoluteFillObject, backgroundColor: "#111" },
  guestVideo: { position: "absolute", width: "31%", height: "25%", right: 10, top: 92, backgroundColor: "#151515", borderRadius: 10, overflow: "hidden", marginBottom: 8 },
  localVideo: { position: "absolute", width: 112, height: 164, right: 12, bottom: 18, backgroundColor: "#1b1b1b", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#555" },
  emptyStage: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10 },
  offVideo: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#151515" },
  nameBadge: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.65)" },
  nameText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  topBar: { position: "absolute", top: 48, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  meta: { color: "#bbb", fontSize: 12, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  actions: { minHeight: 86, paddingHorizontal: 8, paddingVertical: 10, backgroundColor: "#0d0d0d", flexDirection: "row", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 5 },
  action: { minWidth: 56, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  endAction: { minWidth: 62, alignItems: "center", gap: 4, paddingHorizontal: 5 },
  actionText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  joinButton: { marginHorizontal: 12, marginTop: 10, marginBottom: 2, borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: "#FE2C55" },
  secondaryButton: { marginTop: 10, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: "#222" },
  buttonText: { color: "#fff", fontWeight: "800" },
  muted: { color: "#999", fontSize: 12 },
  emptyTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  error: { color: "#ff8a8a", textAlign: "center", fontSize: 14 },
});
