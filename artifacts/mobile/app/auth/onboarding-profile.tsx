import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function OnboardingProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(String(user?.user_metadata?.display_name ?? ""));
  const [username, setUsername] = useState(profile?.username ?? String(user?.user_metadata?.username ?? ""));
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Necesitamos acceso a tu galería para elegir tu foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!user) return;
    if (name.trim().length < 2) return setError("Escribí tu nombre.");
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username.trim())) {
      return setError("El usuario debe tener 3–30 caracteres: letras, números, _ o .");
    }
    setError(null);
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarUri) {
        const ext = avatarUri.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const fileName = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, blob, {
          contentType: ext === "png" ? "image/png" : "image/jpeg", upsert: true,
        });
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
      }
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id, username: username.trim(), email: user.email ?? null, full_name: name.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: name.trim(), username: username.trim() },
      });
      if (authError) throw authError;
      await refreshProfile();
      router.replace("/auth/interests");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const fallback = `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name || user?.email || "user")}&backgroundColor=FE2C55&textColor=ffffff&size=160`;

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.step}>PASO 1 DE 2</Text>
      <Text style={styles.title}>Contanos quién sos</Text>
      <Text style={styles.subtitle}>Completá tu perfil para empezar en TokVid.</Text>
      <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
        <Image source={{ uri: avatarUri ?? profile?.avatar_url ?? fallback }} style={styles.avatar} />
        <View style={styles.camera}><Feather name="camera" size={18} color="#000" /></View>
      </Pressable>
      <Text style={styles.photoHint}>Agregar foto (opcional)</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.label}>Nombre</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#666" style={styles.input} maxLength={60} />
      <Text style={styles.label}>Nombre de usuario</Text>
      <View style={styles.userInput}><Text style={styles.at}>@</Text><TextInput value={username} onChangeText={t => setUsername(t.replace(/\s/g, ""))} placeholder="tunombre" placeholderTextColor="#666" style={styles.userText} autoCapitalize="none" autoCorrect={false} maxLength={30} /></View>
      <Pressable onPress={save} disabled={saving} style={[styles.button, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color="#000" /> : <><Text style={styles.buttonText}>Continuar</Text><Feather name="arrow-right" size={19} color="#000" /></>}
      </Pressable>
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:"#000"}, container:{paddingHorizontal:24,gap:12},
  step:{color:"#00F2EA",fontSize:11,fontWeight:"800",letterSpacing:1.4}, title:{color:"#fff",fontSize:30,fontWeight:"900",marginTop:4},
  subtitle:{color:"#999",fontSize:15,lineHeight:22,marginBottom:18}, avatarWrap:{alignSelf:"center",position:"relative",marginVertical:8},
  avatar:{width:112,height:112,borderRadius:56,backgroundColor:"#1C1C1E",borderWidth:3,borderColor:"#FE2C55"}, camera:{position:"absolute",right:0,bottom:0,width:34,height:34,borderRadius:17,backgroundColor:"#00F2EA",alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:"#000"},
  photoHint:{color:"#777",fontSize:12,textAlign:"center",marginBottom:14}, error:{color:"#FE2C55",fontSize:13,lineHeight:19},
  label:{color:"#aaa",fontSize:13,fontWeight:"700",marginTop:8}, input:{backgroundColor:"#1C1C1E",borderWidth:1,borderColor:"#2C2C2E",borderRadius:13,color:"#fff",paddingHorizontal:16,paddingVertical:14,fontSize:15},
  userInput:{flexDirection:"row",alignItems:"center",backgroundColor:"#1C1C1E",borderWidth:1,borderColor:"#2C2C2E",borderRadius:13,paddingHorizontal:16},at:{color:"#666",fontSize:15},userText:{flex:1,color:"#fff",paddingVertical:14,fontSize:15},
  button:{minHeight:56,borderRadius:16,backgroundColor:"#00F2EA",alignItems:"center",justifyContent:"center",flexDirection:"row",gap:9,marginTop:18},disabled:{opacity:.6},buttonText:{color:"#000",fontSize:16,fontWeight:"900"}
});
