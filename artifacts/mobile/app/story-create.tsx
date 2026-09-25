import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type StoryAsset = {
  uri: string;
  mediaType: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
};

export default function StoryCreateScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [asset, setAsset] = useState<StoryAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickStory = async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Necesitamos permiso para acceder a tu galería.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) return;

    const selected = result.assets[0];
    const mediaType = selected.type === "video" ? "video" : "image";

    setAsset({
      uri: selected.uri,
      mediaType,
      mimeType: selected.mimeType,
      fileName: selected.fileName,
    });
  };

  const publishStory = async () => {
    if (!asset || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const extension =
        asset.fileName?.split(".").pop()?.toLowerCase() ??
        (asset.mediaType === "video" ? "mp4" : "jpg");

      const fallbackMime =
        asset.mediaType === "video"
          ? extension === "mov"
            ? "video/quicktime"
            : "video/mp4"
          : extension === "png"
            ? "image/png"
            : extension === "webp"
              ? "image/webp"
              : "image/jpeg";

      const contentType = asset.mimeType ?? fallbackMime;
      const filePath = `${user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(filePath, blob, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("stories")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: asset.mediaType,
      });

      if (insertError) {
        await supabase.storage.from("stories").remove([filePath]);
        throw insertError;
      }

      router.back();
    } catch (err: any) {
      setError(
        err?.message ??
          "No se pudo publicar la historia. Verificá el acceso a la galería y el bucket 'stories'.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad, paddingBottom: bottomPad },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          disabled={isUploading}
        >
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Crear historia</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.body}>
        <View style={styles.illustration}>
          <Feather
            name={asset?.mediaType === "video" ? "video" : "image"}
            size={56}
            color="#555"
          />
        </View>

        <Text style={styles.heading}>
          {asset ? "Historia lista para publicar" : "Compartí una historia"}
        </Text>
        <Text style={styles.subheading}>
          {asset
            ? "La historia estará disponible durante 24 horas."
            : "Elegí una foto o un video de tu galería. No pedimos cámara ni micrófono en este flujo."}
        </Text>

        {asset ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={pickStory}
            disabled={isUploading}
          >
            <Feather name="image" size={19} color="#fff" />
            <Text style={styles.secondaryButtonText}>Cambiar archivo</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={pickStory}
            disabled={isUploading}
          >
            <Feather name="image" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Elegir de galería</Text>
          </TouchableOpacity>
        )}

        {asset ? (
          <TouchableOpacity
            style={[styles.primaryButton, isUploading && styles.disabled]}
            onPress={publishStory}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="upload-cloud" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Publicar historia</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color="#FE2C55" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 28,
  },
  illustration: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heading: { color: "#fff", fontSize: 21, fontWeight: "700", textAlign: "center" },
  subheading: {
    color: "#666",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
  },
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FE2C55",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  secondaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    paddingVertical: 15,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  errorBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(254,44,85,0.1)",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: "#FE2C55", fontSize: 13, flex: 1, lineHeight: 18 },
});
