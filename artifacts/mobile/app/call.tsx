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
  cancelCall,
  endCall,
  getAgoraCredentials,
  getCall,
  type CallStatus,
  type CallType,
} from "../lib/features/calls/services/calls-service";
import { supabase } from "../lib/supabase";

export default function CallScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { callId, type } = useLocalSearchParams<{ callId: string; type: CallType }>();
  const engineRef = useRef<IRtcEngine | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [answeredAt, setAnsweredAt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(type === "video");
  const [ending, setEnding] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [frontCamera, setFrontCamera] = useState(true);
  const [rtcState, setRtcState] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  useEffect(() => {
    if (!callId) return;

    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const startRtc = async (status: CallStatus, answered: string | null) => {
      if (!mounted || status !== "accepted" || engineRef.current) return;

      try {
        const microphone = await Camera.requestMicrophonePermissionsAsync();
        if (!microphone.granted) throw new Error("Necesitamos permiso para usar el micrófono.");

        if (type === "video") {
          const camera = await Camera.requestCameraPermissionsAsync();
          if (!camera.granted) throw new Error("Necesitamos permiso para usar la cámara.");
        }

        const credentials = await getAgoraCredentials(callId);
        if (!mounted) return;

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        setAnsweredAt(answered);

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
          onConnectionStateChanged: (_connection, state) => {
            if (!mounted) return;
            if (state === 3) setRtcState("connected");
            else if (state === 4 || state === 5) setRtcState("reconnecting");
            else setRtcState("connecting");
          },
          onTokenPrivilegeWillExpire: async () => {
            try {
              const refreshed = await getAgoraCredentials(callId);
              if (mounted) await engine.renewToken(refreshed.token);
            } catch {
              // The call remains controlled by the backend call state.
            }
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

        if (mounted) {
          setRtcState("connected");
          setConnecting(false);
        }
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

    const loadCall = async () => {
      try {
        const call = await getCall(callId);
        if (!mounted) return;
        setCallStatus(call.status);
        setAnsweredAt(call.answered_at);

        if (call.status === "accepted") {
          await startRtc(call.status, call.answered_at);
        } else if (call.status !== "ringing") {
          setConnecting(false);
          Alert.alert("Llamada finalizada", "La llamada ya no está disponible.", [
            { text: "Cerrar", onPress: () => router.back() },
          ]);
        }
      } catch (error) {
        if (mounted) {
          setConnecting(false);
          Alert.alert(
            "No se pudo cargar la llamada",
            error instanceof Error ? error.message : "Ocurrió un error inesperado.",
            [{ text: "Cerrar", onPress: () => router.back() }],
          );
        }
      }
    };

    void loadCall();

    channel = supabase
      .channel(`call-state-${callId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        (payload) => {
          const call = payload.new as CallRecord;
          if (!mounted) return;

          setCallStatus(call.status);
          setAnsweredAt(call.answered_at);

          if (call.status === "accepted") {
            void startRtc(call.status, call.answered_at);
          } else if (call.status !== "ringing") {
            router.back();
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
      const engine = engineRef.current;
      if (engine) {
        void engine.leaveChannel();
        engine.unregisterEventHandler({});
        engine.release();
        engineRef.current = null;
      }
    };
  }, [callId, type]);

  useEffect(() => {
    if (!answeredAt || callStatus !== "accepted") {
      setElapsedSeconds(0);
      return;
    }

    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(answeredAt).getTime()) / 1000)));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [answeredAt, callStatus]);

  const finish = async () => {
    if (!callId || ending) return;
    setEnding(true);
    try {
      if (callStatus === "ringing" && user) {
        const call = await getCall(callId);
        if (call.caller_id === user.id) {
          await cancelCall(callId);
        }
      } else if (callStatus === "accepted") {
        await endCall(callId);
      }
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
    if (type !== "video" || callStatus !== "accepted") return;
    const next = !cameraEnabled;
    engineRef.current?.enableLocalVideo(next);
    setCameraEnabled(next);
  };

  const toggleSpeaker = () => {
    if (callStatus !== "accepted") return;
    const next = !speakerOn;
    engineRef.current?.setEnableSpeakerphone(next);
    setSpeakerOn(next);
  };

  const flipCamera = () => {
    if (type !== "video" || callStatus !== "accepted") return;
    engineRef.current?.switchCamera();
    setFrontCamera((current) => !current);
  };

  const formattedTime = `${Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;

  if (connecting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.connectingText}>
          {callStatus === "ringing" ? "Esperando respuesta…" : "Conectando llamada…"}
        </Text>
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
              <Text style={styles.waitingText}>
                {callStatus === "accepted" ? "Conectando con la otra persona…" : "Esperando a la otra persona…"}
              </Text>
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
            {callStatus === "accepted" ? formattedTime : "Esperando respuesta…"}
          </Text>
          {callStatus === "accepted" && rtcState !== "connected" && (
            <Text style={styles.rtcStatus}>{rtcState === "reconnecting" ? "Reconectando…" : "Conectando…"}</Text>
          )}
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.control} onPress={toggleMute} disabled={callStatus !== "accepted"}>
          <Feather name={muted ? "mic-off" : "mic"} size={22} color="#fff" />
          <Text style={styles.controlLabel}>{muted ? "Activar" : "Silenciar"}</Text>
        </TouchableOpacity>

        {type === "video" && (
          <>
            <TouchableOpacity style={styles.control} onPress={toggleCamera} disabled={callStatus !== "accepted"}>
              <Feather name={cameraEnabled ? "video" : "video-off"} size={22} color="#fff" />
              <Text style={styles.controlLabel}>{cameraEnabled ? "Cámara" : "Sin cámara"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.control} onPress={flipCamera} disabled={callStatus !== "accepted" || !cameraEnabled}>
              <Feather name="refresh-cw" size={22} color="#fff" />
              <Text style={styles.controlLabel}>{frontCamera ? "Trasera" : "Frontal"}</Text>
            </TouchableOpacity>
          </>
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

type CallRecord = {
  status: CallStatus;
  answered_at: string | null;
};

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
  waitingText: { color: "#777", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  voiceStage: { alignItems: "center", gap: 12 },
  voiceTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  voiceStatus: { color: "#999", fontSize: 14 },
  rtcStatus: { color: "#aaa", fontSize: 13 },
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
