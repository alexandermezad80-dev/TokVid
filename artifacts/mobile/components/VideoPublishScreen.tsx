import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createVideo, type VideoStorageClient } from "../lib/video/createVideo";

interface VideoPublishScreenProps {
  userId: string;
  videoUri: string;
  client: VideoStorageClient;
  fetchFile?: typeof fetch;
  onPublished?: (videoId: string) => void;
  onClose?: () => void;
}

export async function submitVideoFromScreen(
  props: Pick<VideoPublishScreenProps, "userId" | "videoUri" | "client" | "fetchFile">,
  caption: string,
) {
  return createVideo(
    { userId: props.userId, videoUri: props.videoUri, caption },
    props.client,
    props.fetchFile,
  );
}

export default function VideoPublishScreen({
  userId,
  videoUri,
  client,
  fetchFile,
  onPublished,
  onClose,
}: VideoPublishScreenProps) {
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePublish = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await submitVideoFromScreen(
      { userId, videoUri, client, fetchFile },
      caption,
    );

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    if (result.videoId) onPublished?.(result.videoId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Publicar video</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.preview}>
          <Feather name="play-circle" size={58} color="#fff" />
          <Text style={styles.previewLabel}>Vista previa del video</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            testID="video-caption"
            value={caption}
            onChangeText={setCaption}
            placeholder="Cuéntale a tu comunidad de qué trata..."
            placeholderTextColor="#777"
            multiline
            maxLength={300}
            style={styles.input}
          />
          <Text style={styles.counter}>{caption.length}/300</Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity style={styles.option}>
            <View style={styles.optionIcon}>
              <Feather name="hash" size={20} color="#fff" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Hashtags</Text>
              <Text style={styles.optionSubtitle}>Agrega etiquetas para encontrar tu video</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option}>
            <View style={styles.optionIcon}>
              <Feather name="users" size={20} color="#fff" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Visibilidad</Text>
              <Text style={styles.optionSubtitle}>Todos pueden ver este video</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Video publicado correctamente.</Text> : null}

        <TouchableOpacity
          testID="publish-video-button"
          style={[styles.publishButton, submitting && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={submitting}
        >
          <Feather name="upload-cloud" size={20} color="#fff" />
          <Text style={styles.publishText}>{submitting ? "Publicando..." : "Publicar video"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 42 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  content: { flex: 1, padding: 16 },
  preview: {
    height: 260,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  previewLabel: { color: "#888", fontSize: 13 },
  field: { marginTop: 20, backgroundColor: "#111", borderRadius: 14, padding: 14 },
  label: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  input: { color: "#fff", minHeight: 76, fontSize: 15, lineHeight: 22 },
  counter: { color: "#666", textAlign: "right", fontSize: 12, marginTop: 6 },
  options: { marginTop: 14, backgroundColor: "#111", borderRadius: 14, overflow: "hidden" },
  option: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#202020",
  },
  optionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#202020", alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1, marginLeft: 12 },
  optionTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  optionSubtitle: { color: "#777", fontSize: 12, marginTop: 3 },
  error: { color: "#ff6b81", marginTop: 12, textAlign: "center" },
  success: { color: "#7ee787", marginTop: 12, textAlign: "center" },
  publishButton: {
    marginTop: 18,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FE2C55",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  publishButtonDisabled: { opacity: 0.65 },
  publishText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
