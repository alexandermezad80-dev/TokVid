import ReferenceHeader from "../components/reference/ReferenceHeader";
import BrandOutline,{BrandDivider} from "../components/reference/BrandOutline";
import {referenceVisual as v} from "../constants/referenceVisual";
import {LinearGradient} from "expo-linear-gradient";
import {StatusBar} from "expo-status-bar";
import {KeyboardAwareScrollViewCompat} from "../components/KeyboardAwareScrollViewCompat";
import ProfilePhotoCrop from "../components/ProfilePhotoCrop";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { saveProfileChanges, uploadProfileAvatar } from "../lib/features/profile/avatar";

function avatarPlaceholder(user: any, profile: any): string {
  if (profile?.avatar_url) return profile.avatar_url;
  const seed = encodeURIComponent(user?.email ?? "user");
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=128`;
}

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) requestRegistration();
  }, [user]);

  const insets = useSafeAreaInsets();

  const [photoMenu,setPhotoMenu]=useState(false),[cropUri,setCropUri]=useState<string|null>(null);
  const [fullName,setFullName]=useState(profile?.full_name??"");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  useEffect(() => { setSelectedPhoto(null); }, [user?.id]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name??"");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const pickImage = async (camera=false) => {
    if (savingRef.current) return;
    setError(null);
    try {
      setPhotoMenu(false);
      const { status } = camera?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para cambiar la foto.");
        return;
      }

      const result = await (camera?ImagePicker.launchCameraAsync:ImagePicker.launchImageLibraryAsync)({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        if (!result.assets[0].base64) throw new Error("No se pudo leer la foto. Selecciona otra imagen.");
        setSelectedPhoto(result.assets[0]);
      }
    } catch (e: any) {
      setError(e.message ?? "No se pudo abrir la galería.");
    }
  };

  const handleSave = async () => {
    if (!user || savingRef.current) return;
    if (!username.trim()) {
      setError("El nombre de usuario no puede estar vacío.");
      return;
    }
    if (username.trim().length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setError(null);
    savingRef.current = true;
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      // Upload new avatar if selected
      if (selectedPhoto?.base64) {
        setUploadingPhoto(true);
        avatarUrl = await uploadProfileAvatar(user.id, selectedPhoto.base64);
        setUploadingPhoto(false);
      }

      const updates = {
        username: username.trim(),
        bio: bio.trim(),
        full_name: fullName.trim() || username.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      };
      if (username.trim() !== profile?.username) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { username: username.trim(), display_name: username.trim() },
        });
        if (metadataError) throw metadataError;
      }
      await saveProfileChanges(user.id, updates);

      await refreshProfile(true);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "No se pudo guardar. Intentá de nuevo.");
    } finally {
      savingRef.current = false;
      setUploadingPhoto(false);
      setSaving(false);
    }
  };

  if (!user) return null;
  const currentAvatar = selectedPhoto?.uri ?? profile?.avatar_url ?? "";

  return (
    <View style={styles.root}>
      {/* Header */}
      <ReferenceHeader variant="tools">
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} disabled={saving}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
      </ReferenceHeader>

      <KeyboardAwareScrollViewCompat
        bottomOffset={6}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{paddingHorizontal:20,paddingTop:16,paddingBottom:16,backgroundColor:v.white}}><Text style={[styles.headerTitle,{marginBottom:16}]}>Información de perfil</Text>
        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <Pressable onPress={()=>setPhotoMenu(true)} style={styles.avatarWrap} disabled={saving} accessibilityLabel="Opciones de foto de perfil">
            <LinearGradient colors={v.outline} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
            {!!currentAvatar&&<Image source={{uri:currentAvatar}} style={styles.avatar}/>}
            <View style={currentAvatar?styles.cameraBadge:styles.avatarOverlay}>{uploadingPhoto?<ActivityIndicator color="#FFF"/>:<Feather name="camera" size={currentAvatar?18:28} color="#FFF"/>}</View>
          </Pressable>
          <View style={{flex:1,gap:10}}><TouchableOpacity accessibilityLabel="Guardar perfil" onPress={handleSave} disabled={saving} style={styles.saveBtn}><BrandOutline radius={8}/>{saving?<ActivityIndicator color={v.ink}/>:<Text style={styles.saveBtnText}>Guardar</Text>}</TouchableOpacity><Pressable onPress={()=>setPhotoMenu(true)} disabled={saving} style={styles.photoAction}><Feather name="camera" size={16} color={v.ink}/><Text style={styles.photoActionText}>Cambiar foto</Text></Pressable><Pressable disabled={!currentAvatar||saving} style={styles.photoAction} onPress={()=>setCropUri(currentAvatar)}><Feather name="crop" size={16} color={v.ink}/><Text style={styles.photoActionText}>Recortar foto</Text></Pressable></View>
        </View>

        </View>
        <BrandDivider/>
        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#FE2C55" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Compact, editable profile information follows the supplied reference. */}
        <View style={styles.section}>
          <View style={styles.nameRow}>
            <Text style={styles.label}>Nombre:</Text>
            <TextInput
              accessibilityLabel="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
              maxLength={80}
              editable={!saving}
              placeholder="Tu nombre"
              placeholderTextColor="#85858D"
              style={[styles.inlineInput, styles.nameInput]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre de usuario</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                accessibilityLabel="Nombre de usuario"
                value={username}
                editable={!saving}
                onChangeText={(t) => setUsername(t.replace(/\s/g, ""))}
                placeholder="usuario"
                placeholderTextColor="#85858D"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                style={styles.inlineInput}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              accessibilityLabel="Descripción del perfil"
              value={bio}
              editable={!saving}
              onChangeText={t=>setBio(Array.from(t.split("\n").slice(0,3).join("\n")).slice(0,200).join(""))}
              placeholder="Contá algo sobre vos..."
              placeholderTextColor="#85858D"
              multiline
              scrollEnabled={false}
              maxLength={200}
              style={styles.bioInput}
            />
            <Text style={styles.counter}>{Array.from(bio).length}/200</Text>
          </View>
        </View>

        <BrandDivider/>
        <View style={styles.emailSection}>
          <View style={styles.emailBox} accessibilityLabel={`Correo: ${user.email ?? ""}. No editable.`}>
            <Text selectable style={styles.emailText}>Correo: {user.email ?? ""}</Text>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
      <Modal visible={photoMenu} transparent animationType="slide" onRequestClose={()=>setPhotoMenu(false)}><View style={{flex:1,justifyContent:"flex-end",backgroundColor:"#0008"}}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setPhotoMenu(false)}/><View style={{backgroundColor:"#FFFFFF",borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,paddingBottom:insets.bottom+32}}>{[{title:"Cargar foto",icon:"image" as const,run:()=>pickImage(false)},{title:"Tomar foto",icon:"camera" as const,run:()=>pickImage(true)},{title:"Ver foto",icon:"maximize" as const,run:()=>{setPhotoMenu(false);router.push({pathname:"/profile-photo",params:{uri:currentAvatar}});}}].map(a=><Pressable key={a.title} accessibilityLabel={a.title} onPress={a.run} style={{minHeight:54,flexDirection:"row",gap:14,alignItems:"center"}}><Feather name={a.icon} color={v.ink} size={22}/><Text style={{fontFamily:"Inter_400Regular",color:v.ink,fontSize:16}}>{a.title}</Text></Pressable>)}</View></View></Modal>
      <ProfilePhotoCrop uri={cropUri} onClose={()=>setCropUri(null)} onSave={photo=>setSelectedPhoto({uri:photo.uri,width:photo.initWidth,height:photo.initHeight,base64:photo.base64,mimeType:"image/jpeg",type:"image"})}/>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraBadge:{position:"absolute",bottom:6,right:6,width:30,height:30,borderRadius:15,backgroundColor:"#161823DD",alignItems:"center",justifyContent:"center"},photoAction:{minHeight:36,flexDirection:"row",alignItems:"center",gap:8},photoActionText:{ fontFamily: "Inter_500Medium",color:v.ink,fontSize:13},
  root: { flex: 1, backgroundColor: v.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor:v.ink,borderBottomLeftRadius:20,borderBottomRightRadius:20,zIndex:2,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", color: v.ink, fontSize: 17, },
  saveBtn: {
    backgroundColor: v.white,
    borderRadius: 8,
    paddingHorizontal: 18,
    height:34,justifyContent:"center",
    minWidth: 80,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: "Inter_500Medium", color: v.ink, fontSize: 14 },
  container: { flexGrow: 1, paddingTop: 0 },
  avatarSection: { flexDirection:"row",alignItems: "center",gap:20 },
  avatarWrap: {
    width: 128,
    height: 128,
    borderRadius: 20,
    overflow: "hidden",
    padding:1,
  },
  avatar: { width: "100%", height: "100%",borderRadius:19, backgroundColor: "#1C1C1E" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  avatarOverlayText: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 11, },
  avatarHint: { fontFamily: "Inter_400Regular", color: "#555", fontSize: 12 },
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
  errorText: { fontFamily: "Inter_400Regular", color: "#FE2C55", fontSize: 13, flex: 1 },
  section: {
    backgroundColor:"#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  field: { gap: 2 },
  label: { fontFamily: "Inter_400Regular", color: "#737373", fontSize: 14, lineHeight: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  usernameRow: { flexDirection: "row", alignItems: "center" },
  usernamePrefix: { fontFamily: "Inter_500Medium", color: v.ink, fontSize: 15, },
  inlineInput: { fontFamily: "Inter_500Medium",
    flex: 1,
    minWidth: 0,
    color: v.ink,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 0,
    paddingVertical: 2,
    backgroundColor: "transparent",
  },
  nameInput: { minHeight: 28 },
  bioInput: { fontFamily: "Inter_400Regular",
    color: v.ink,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 80,
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 4,
    textAlignVertical: "top",
    backgroundColor: "transparent",
  },
  counter: { fontFamily: "Inter_400Regular", alignSelf: "flex-end", color: v.darkGray, fontSize: 12, marginTop: 2 },
  emailSection: { paddingHorizontal:20,paddingTop:13,flex:1,backgroundColor:v.white },
  emailBox: {
    minHeight: 46,
    justifyContent: "center",
    backgroundColor: v.white,
    borderWidth: 1,
    borderColor: v.border,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emailText: { fontFamily: "Inter_400Regular", color: v.secondary, fontSize: 15, lineHeight: 21, flexShrink: 1 },
});
