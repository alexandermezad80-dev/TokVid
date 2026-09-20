import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function avatarPlaceholder(user: any, profile: any): string {
  if (profile?.avatar_url) return profile.avatar_url;
  const seed = encodeURIComponent(user?.email ?? "user");
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=128`;
}

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para cambiar la foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarUri || !user) return null;

    setUploadingPhoto(true);
    try {
      const ext = avatarUri.split(".").pop()?.toLowerCase() ?? "jpg";
      const fileName = `${user.id}/avatar.${ext}`;
      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      // Fetch the image as blob
      const response = await fetch(avatarUri);
      const blob = await response.blob();

      // Upload with supabase-js so the authenticated session is applied to Storage RLS
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (e: any) {
      console.warn("Avatar upload failed:", e.message);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError("El nombre de usuario no puede estar vacío.");
      return;
    }
    if (username.trim().length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      // Upload new avatar if selected
      if (avatarUri) {
        const uploaded = await uploadAvatar();
        if (uploaded) avatarUrl = uploaded;
      }

      const updates: Record<string, any> = {
        id: user!.id,
        username: username.trim(),
        bio: bio.trim(),
        full_name: profile?.full_name ?? username.trim(),
        updated_at: new Date().toISOString(),
      };
      if (avatarUrl) updates.avatar_url = avatarUrl;

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert(updates);

      if (dbError) throw dbError;

      // Also update auth metadata
      await supabase.auth.updateUser({
        data: { username: username.trim(), display_name: username.trim() },
      });

      await refreshProfile();
      router.back();
    } catch (e: any) {
      setError(e.message ?? "No se pudo guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarUri ?? avatarPlaceholder(user, profile);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            <Image source={{ uri: currentAvatar }} style={styles.avatar} />
            <View style={styles.avatarOverlay}>
              {uploadingPhoto ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="camera" size={22} color="#fff" />
                  <Text style={styles.avatarOverlayText}>Cambiar foto</Text>
                </>
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tocá para cambiar tu foto de perfil</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#FE2C55" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Fields */}
        <View style={styles.section}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre de usuario</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                value={username}
                onChangeText={(t) => setUsername(t.replace(/\s/g, ""))}
                placeholder="tunombre"
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                style={styles.inputInner}
              />
            </View>
            <Text style={styles.hint}>{30 - username.length} caracteres restantes</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Biografía</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Contá algo sobre vos..."
              placeholderTextColor="#555"
              multiline
              maxLength={150}
              style={[styles.input, styles.bioInput]}
            />
            <Text style={styles.hint}>{150 - bio.length} caracteres restantes</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={user?.email ?? ""}
              editable={false}
              style={[styles.input, styles.disabledInput]}
            />
            <Text style={styles.hint}>El email no se puede cambiar</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C1E",
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  saveBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  container: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  avatarSection: { alignItems: "center", gap: 10 },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FE2C55",
  },
  avatar: { width: "100%", height: "100%", backgroundColor: "#1C1C1E" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  avatarOverlayText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  avatarHint: { color: "#555", fontSize: 12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(254,44,85,0.1)",
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.3)",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: "#FE2C55", fontSize: 13, flex: 1 },
  section: { gap: 20 },
  field: { gap: 8 },
  label: { color: "#aaa", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    paddingHorizontal: 16,
  },
  atSign: { color: "#555", fontSize: 15, paddingRight: 2 },
  inputInner: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 14,
  },
  bioInput: { height: 100, textAlignVertical: "top", paddingTop: 14 },
  disabledInput: { opacity: 0.4 },
  hint: { color: "#555", fontSize: 11 },
});
