import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { saveVideoTags } from "../../lib/videoTags";

type Phase = "pick" | "edit" | "uploading" | "success";

export default function CreateScreen() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, profile } = useAuth();

  const player = useVideoPlayer(videoUri ?? "", (p) => { p.loop = true; });

  const pickVideo = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Necesitamos permiso para acceder a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 180,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setPhase("edit");
    }
  };

  const upload = async () => {
    if (!videoUri || !user) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);

    try {
      // Simulate progress while fetching the file
      setProgress(10);
      const response = await fetch(videoUri);
      const blob = await response.blob();
      setProgress(40);

      const ext = videoUri.split(".").pop() ?? "mp4";
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, blob, { contentType: "video/mp4", upsert: false });

      if (uploadError) throw uploadError;
      setProgress(80);

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);

      const trimmedCaption = caption.trim();
      const { data: inserted, error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          video_url: urlData.publicUrl,
          caption: trimmedCaption,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Persist hashtags + mention notifications. Best-effort: the video is
      // already uploaded, so tag failures must not surface as an upload error.
      if (inserted?.id) {
        try {
          await saveVideoTags({
            videoId: inserted.id,
            caption: trimmedCaption,
            authorId: user.id,
            authorName: profile?.username ?? "Alguien",
            authorAvatar: profile?.avatar_url ?? null,
          });
        } catch {
          /* non-critical */
        }
      }

      setProgress(100);
      setPhase("success");
    } catch (err: any) {
      setError(err?.message ?? "Error al subir el video. Verificá que el bucket 'videos' existe en Supabase Storage.");
      setPhase("edit");
    }
  };

  const reset = () => {
    setPhase("pick");
    setVideoUri(null);
    setCaption("");
    setProgress(0);
    setError(null);
  };

  // ── Pick phase ──────────────────────────────────────────────
  if (phase === "pick") {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad + 80 }]}>
        <View style={styles.pickHeader}>
          <Text style={styles.pickTitle}>Crear video</Text>
        </View>

        <View style={styles.pickBody}>
          <View style={styles.pickIllustration}>
            <Feather name="video" size={64} color="#333" />
          </View>
          <Text style={styles.pickHeading}>Subí tu video</Text>
          <Text style={styles.pickSub}>Elegí un video de tu galería para compartir con tu comunidad</Text>

          <TouchableOpacity style={styles.pickBtn} onPress={pickVideo}>
            <Feather name="image" size={20} color="#fff" />
            <Text style={styles.pickBtnText}>Elegir de galería</Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#FE2C55" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Tips</Text>
            {["Hasta 3 minutos de duración", "Formato MP4 o MOV", "Buena iluminación y sonido claro"].map((t) => (
              <View key={t} style={styles.tipRow}>
                <Feather name="check-circle" size={14} color="#25F4EE" />
                <Text style={styles.tipText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Success phase ───────────────────────────────────────────
  if (phase === "success") {
    return (
      <View style={[styles.container, styles.center, { paddingBottom: botPad + 80 }]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={40} color="#fff" />
        </View>
        <Text style={styles.successTitle}>¡Video subido!</Text>
        <Text style={styles.successSub}>Tu video ya está disponible en tu perfil</Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => { reset(); router.push("/(tabs)/profile"); }}>
          <Text style={styles.successBtnText}>Ver en perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successBtnAlt} onPress={reset}>
          <Text style={styles.successBtnAltText}>Subir otro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Edit / Uploading phase ──────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad + 80 }]}>
      <View style={styles.editHeader}>
        <TouchableOpacity onPress={reset} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.editTitle}>Detalles del video</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Video preview */}
      <View style={styles.previewWrap}>
        {videoUri ? (
          <VideoView
            player={player}
            style={styles.preview}
            contentFit="cover"
            nativeControls={false}
          />
        ) : null}
        <View style={styles.previewOverlay}>
          <Feather name="play-circle" size={40} color="rgba(255,255,255,0.7)" />
        </View>
      </View>

      {/* Caption */}
      <View style={styles.captionWrap}>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Escribí una descripción para tu video..."
          placeholderTextColor="#555"
          style={styles.captionInput}
          multiline
          maxLength={300}
          editable={phase !== "uploading"}
        />
        <Text style={styles.captionCount}>{caption.length}/300</Text>
      </View>

      {/* Progress bar while uploading */}
      {phase === "uploading" && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>Subiendo... {progress}%</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={16} color="#FE2C55" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Upload button */}
      <TouchableOpacity
        style={[styles.uploadBtn, phase === "uploading" && styles.uploadBtnDisabled]}
        onPress={upload}
        disabled={phase === "uploading"}
      >
        {phase === "uploading" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="upload-cloud" size={20} color="#fff" />
            <Text style={styles.uploadBtnText}>Publicar video</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },

  // Pick
  pickHeader: { paddingHorizontal: 16, paddingVertical: 16 },
  pickTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  pickBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
  pickIllustration: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#111",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  pickHeading: { color: "#fff", fontSize: 22, fontWeight: "700" },
  pickSub: { color: "#555", fontSize: 14, textAlign: "center", lineHeight: 22 },
  pickBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FE2C55",
    borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    marginTop: 8,
  },
  pickBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  tipsBox: {
    backgroundColor: "#111", borderRadius: 14,
    padding: 16, gap: 10, width: "100%", marginTop: 8,
  },
  tipsTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { color: "#888", fontSize: 13 },

  // Edit
  editHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#111",
  },
  backBtn: { padding: 6 },
  editTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  previewWrap: {
    height: 240, backgroundColor: "#111",
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 12, overflow: "hidden",
    position: "relative",
  },
  preview: { ...StyleSheet.absoluteFillObject },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
    pointerEvents: "none",
  } as any,
  captionWrap: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: "#111", borderRadius: 12, padding: 14,
  },
  captionInput: {
    color: "#fff", fontSize: 15, lineHeight: 22,
    minHeight: 80,
  },
  captionCount: { color: "#555", fontSize: 12, textAlign: "right", marginTop: 8 },

  // Progress
  progressWrap: { marginHorizontal: 16, marginTop: 16, gap: 8 },
  progressTrack: { height: 4, backgroundColor: "#1C1C1E", borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: "#FE2C55", borderRadius: 2 },
  progressText: { color: "#888", fontSize: 13, textAlign: "center" },

  // Upload btn
  uploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#FE2C55",
    marginHorizontal: 16, marginTop: 20, borderRadius: 14, paddingVertical: 16,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Success
  successIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#FE2C55",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  successSub: { color: "#888", fontSize: 14, textAlign: "center" },
  successBtn: {
    backgroundColor: "#FE2C55", borderRadius: 14,
    paddingHorizontal: 40, paddingVertical: 14, width: "100%", alignItems: "center",
  },
  successBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  successBtnAlt: {
    backgroundColor: "#1C1C1E", borderRadius: 14,
    paddingHorizontal: 40, paddingVertical: 14, width: "100%", alignItems: "center",
  },
  successBtnAltText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(254,44,85,0.1)",
    borderRadius: 10, padding: 12,
    marginHorizontal: 16, marginTop: 12,
  },
  errorText: { color: "#FE2C55", fontSize: 13, flex: 1, lineHeight: 18 },
});
