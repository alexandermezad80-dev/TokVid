import {
  ClientRoleType,
  ChannelProfileType,
  RtcSurfaceView,
  createAgoraRtcEngine,
  type IRtcEngine,
} from "react-native-agora";
import { Camera } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import {
  endCall,
  getAgoraCredentials,
  type CallType,
} from "../lib/features/calls/services/calls-service";

export default function CallScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { callId, type } = useLocalSearchParams<{ callId: string; type: CallType }>();
  const engineRef = useRef<IRtcEngine | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(type === "video");
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      if (!user || !callId || (type !== "voice" && type !== "video")) {
        if (mounted) setConnecting(false);
        return;
      }

      try {
        const microphone = await Camera.requestMicrophonePermissionsAsync();
        if (!microphone.granted) throw new Error("Necesitamos permiso para usar el micrófono.");

        if (type === "video") {
          const camera = await Camera.requestCameraPermissionsAsync();
          if (!camera.granted) throw new Error("Necesitamos permiso para usar la cámara.");
        }

        const credentials = await getAgoraCredentials(callId);
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        engine.initialize({
          appId: credentials.appId,
          channelProfile: ChannelProfileType.channelProfileCommunication,
        });

        engine.registerEventHandler({
          onUserJoined: (_connection, uid) => {
            if (mounted) setRemoteUid(uid);
          },
          onUserOffline: (_connection, uid) => {
            if (mounted) setRemoteUid((current) => (current === uid ? null : current));
          },
        });

        engine.setClientRole(ClientRoleType.clientRoleBroadcaster);
        if (type === "video") engine.enableVideo();
        engine.enableLocalVideo(type === "video");
        engine.enableLocalAudio(true);

        await engine.joinChannel(credentials.token, credentials.channel, credentials.uid, {
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
          channelProfile: ChannelProfileType.channelProfileCommunication,
          publishMicrophoneTrack: true,
          publishCameraTrack: type === "video",
          autoSubscribeAudio: true,
          autoSubscribeVideo: type === "video",
        });

        if (mounted) setConnecting(false);
      } catch (error) {
        if (mounted) {
          setConnecting(false);
          Alert.alert(
            "No se pudo iniciar la llamada",
            error instanceof Error ? error.message : "Ocurrió un error inesperado.",
            [{ text: "Cerrar", onPress: () => router.back() }],
          );
        }
      }
    };

    void start();

    return () => {
      mounted = false;
      const engine = engineRef.current;
      if (engine) {
        engine.leaveChannel();
        engine.unregisterEventHandler({});
        engine.release();
        engineRef.current = null;
      }
    };
  }, [callId, type, user]);

  const finish = async () => {
    if (!callId || ending) return;
    setEnding(true);
    try {
      await endCall(callId);
    } catch {
      // The RTC engine is still closed locally even if the backend request fails.
    } finally {
      const engine = engineRef.current;
      if (engine) {
        await engine.leaveChannel();
        engine.release();
        engineRef.current = null;
      }
      router.back();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    engineRef.current?.muteLocalAudioStream(next);
    setMuted(next);
  };

  const toggleCamera = () => {
    if (type !== "video") return;
    const next = !cameraEnabled;
    engineRef.current?.enableLocalVideo(next);
    setCameraEnabled(next);
  };

  if (connecting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.connectingText}>Conectando llamada…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {type === "video" ? (
        <View style={styles.videoStage}>
          {remoteUid !== null ? (
            <RtcSurfaceView
              style={styles.remoteVideo}
              canvas={{ uid: remoteUid }}
              zOrderMediaOverlay={false}
            />
          ) : (
            <View style={styles.waiting}>
              <Feather name="video" size={34} color="#777" />
              <Text style={styles.waitingText}>Esperando a la otra persona…</Text>
            </View>
          )}

          {cameraEnabled ? (
            <RtcSurfaceView
              style={styles.localVideo}
              canvas={{ uid: 0 }}
              zOrderMediaOverlay
            />
          ) : (
            <View style={styles.localOff}>
              <Feather name="video-off" size={22} color="#fff" />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.voiceStage}>
          <Feather name="phone" size={48} color="#fff" />
          <Text style={styles.voiceTitle}>Llamada de voz</Text>
          <Text style={styles.voiceStatus}>
            {remoteUid !== null ? "Conectada" : "Esperando respuesta…"}
          </Text>
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.control} onPress={toggleMute}>
          <Feather name={muted ? "mic-off" : "mic"} size={22} color="#fff" />
          <Text style={styles.controlLabel}>{muted ? "Activar" : "Silenciar"}</Text>
        </TouchableOpacity>

        {type === "video" && (
          <TouchableOpacity style={styles.control} onPress={toggleCamera}>
            <Feather name={cameraEnabled ? "video" : "video-off"} size={22} color="#fff" />
            <Text style={styles.controlLabel}>{cameraEnabled ? "Cámara" : "Sin cámara"}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.endButton}
          onPress={() => void finish()}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Feather name="phone-off" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  connectingText: { color: "#aaa", marginTop: 16, fontSize: 15 },
  videoStage: { ...StyleSheet.absoluteFillObject, backgroundColor: "#101010" },
  remoteVideo: { ...StyleSheet.absoluteFillObject },
  localVideo: {
    position: "absolute",
    top: 48,
    right: 16,
    width: 112,
    height: 164,
    borderRadius: 12,
    overflow: "hidden",
  },
  localOff: {
    position: "absolute",
    top: 48,
    right: 16,
    width: 112,
    height: 164,
    borderRadius: 12,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  waiting: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  waitingText: { color: "#777", fontSize: 14 },
  voiceStage: { alignItems: "center", gap: 12 },
  voiceTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  voiceStatus: { color: "#999", fontSize: 14 },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingTop: 18,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  control: { alignItems: "center", gap: 6, minWidth: 64 },
  controlLabel: { color: "#fff", fontSize: 11 },
  endButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#d7193f",
    alignItems: "center",
    justifyContent: "center",
  },
});
